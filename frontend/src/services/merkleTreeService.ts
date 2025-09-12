/**
 * Merkle Tree Service - Generates Merkle trees and proofs for verification data
 * Used for creating zero-knowledge proofs and verification structures
 */

import { aadhaarService, AadhaarData } from './aadhaarService'
import { itrService, ITRData } from './itrService'
import { robustHash, hashObject, merkleHash } from '../utils/hashUtils'

export interface MerkleNode {
  hash: string
  left?: MerkleNode
  right?: MerkleNode
  data?: any
}

export interface MerkleProof {
  root: string
  leaf: string
  path: string[]
  indices: number[]
  verified: boolean
}

export interface VerificationProof {
  type: 'aadhaar' | 'itr' | 'face' | 'combined'
  data: any
  merkleProof: MerkleProof
  timestamp: number
  qrCode: string
}

class MerkleTreeService {
  /**
   * Generate Merkle tree from verification data
   */
  generateMerkleTree(data: any[]): MerkleNode {
    if (data.length === 0) {
      throw new Error('Cannot create Merkle tree with empty data')
    }

    // Convert data to leaf nodes
    const leaves = data.map(item => ({
      hash: hashObject(item),
      data: item
    }))

    // Build tree bottom-up
    let currentLevel = leaves
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = []
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || left // Duplicate last node if odd number
        
        const parent: MerkleNode = {
          hash: merkleHash(left.hash, right.hash),
          left,
          right
        }
        
        nextLevel.push(parent)
      }
      
      currentLevel = nextLevel
    }

    return currentLevel[0]
  }

  /**
   * Generate Merkle proof for specific data
   */
  generateProof(tree: MerkleNode, targetData: any): MerkleProof {
    const targetHash = hashObject(targetData)
    const path: string[] = []
    const indices: number[] = []
    
    // Find the path to the target data
    this.findPath(tree, targetHash, path, indices)
    
    return {
      root: tree.hash,
      leaf: targetHash,
      path,
      indices,
      verified: this.verifyProof(targetHash, path, indices, tree.hash)
    }
  }

  /**
   * Verify Merkle proof
   */
  verifyProof(leaf: string, path: string[], indices: number[], root: string): boolean {
    let currentHash = leaf
    
    for (let i = 0; i < path.length; i++) {
      const sibling = path[i]
      const isLeft = indices[i] === 0
      
      if (isLeft) {
        currentHash = merkleHash(currentHash, sibling)
      } else {
        currentHash = merkleHash(sibling, currentHash)
      }
    }
    
    return currentHash === root
  }

  /**
   * Generate combined verification proof
   */
  async generateCombinedProof(
    aadhaarData: AadhaarData,
    itrData: ITRData,
    faceHash: string
  ): Promise<VerificationProof> {
    try {
      console.log('🌳 Generating combined verification proof...')

      // Create verification data array
      const verificationData = [
        {
          type: 'aadhaar',
          data: aadhaarData,
          hash: this.hashData(aadhaarData)
        },
        {
          type: 'itr',
          data: itrData,
          hash: this.hashData(itrData)
        },
        {
          type: 'face',
          data: { faceHash },
          hash: faceHash
        }
      ]

      // Generate Merkle tree
      const tree = this.generateMerkleTree(verificationData)
      
      // Generate proof for the root
      const merkleProof = this.generateProof(tree, verificationData[0])

      // Generate QR code data
      const qrData = {
        root: tree.hash,
        timestamp: Date.now(),
        verificationTypes: ['aadhaar', 'itr', 'face'],
        proof: merkleProof
      }

      const qrCode = this.generateQRCode(JSON.stringify(qrData))

      const combinedProof: VerificationProof = {
        type: 'combined',
        data: verificationData,
        merkleProof,
        timestamp: Date.now(),
        qrCode
      }

      console.log('✅ Combined verification proof generated successfully')
      return combinedProof
    } catch (error) {
      console.error('❌ Combined proof generation failed:', error)
      throw error
    }
  }

  /**
   * Generate QR code for verification proof
   */
  generateQRCode(data: string): string {
    // In production, this would use a QR code library like qrcode
    // For now, we'll return a data URL representation
    const qrData = {
      data: data,
      timestamp: Date.now(),
      version: '1.0'
    }

    return `data:application/json;base64,${btoa(JSON.stringify(qrData))}`
  }


  /**
   * Find path to target data in Merkle tree
   */
  private findPath(node: MerkleNode, targetHash: string, path: string[], indices: number[]): boolean {
    if (!node.left && !node.right) {
      return node.hash === targetHash
    }

    if (node.left && this.findPath(node.left, targetHash, path, indices)) {
      if (node.right) {
        path.push(node.right.hash)
        indices.push(1)
      }
      return true
    }

    if (node.right && this.findPath(node.right, targetHash, path, indices)) {
      if (node.left) {
        path.push(node.left.hash)
        indices.push(0)
      }
      return true
    }

    return false
  }

  /**
   * Generate individual verification proof
   */
  async generateIndividualProof(type: 'aadhaar' | 'itr' | 'face', data: any): Promise<VerificationProof> {
    try {
      console.log(`🌳 Generating ${type} verification proof...`)

      const verificationData = [{
        type,
        data,
        hash: this.hashData(data)
      }]

      const tree = this.generateMerkleTree(verificationData)
      const merkleProof = this.generateProof(tree, verificationData[0])

      const qrData = {
        root: tree.hash,
        timestamp: Date.now(),
        verificationType: type,
        proof: merkleProof
      }

      const qrCode = this.generateQRCode(JSON.stringify(qrData))

      const proof: VerificationProof = {
        type,
        data: verificationData[0],
        merkleProof,
        timestamp: Date.now(),
        qrCode
      }

      console.log(`✅ ${type} verification proof generated successfully`)
      return proof
    } catch (error) {
      console.error(`❌ ${type} proof generation failed:`, error)
      throw error
    }
  }

  /**
   * Verify QR code proof
   */
  verifyQRProof(qrCode: string): boolean {
    try {
      const qrData = JSON.parse(atob(qrCode.split(',')[1]))
      const proof = qrData.proof
      
      return this.verifyProof(
        proof.leaf,
        proof.path,
        proof.indices,
        proof.root
      )
    } catch (error) {
      console.error('❌ QR proof verification failed:', error)
      return false
    }
  }
}

export const merkleTreeService = new MerkleTreeService()
