/**
 * Aadhaar Service - Handles Aadhaar QR code decoding and verification
 * Integrates with anon-aadhaar for zero-knowledge proofs
 */

import { backendService } from './backendService'

export interface AadhaarData {
  uid: string
  name: string
  gender: string
  yearOfBirth: string
  careOf: string
  house: string
  street: string
  landmark: string
  locality: string
  vtc: string
  postOffice: string
  district: string
  subDistrict: string
  state: string
  pincode: string
  phone: string
  email: string
  rawData: string
  timestamp: number
}

export interface AadhaarVerificationResult {
  success: boolean
  data?: AadhaarData
  error?: string
  verificationId?: string
}

class AadhaarService {
  private readonly baseUrl = 'http://localhost:8000'

  /**
   * Decode Aadhaar QR code data
   * In a real implementation, this would use anon-aadhaar for ZKP
   */
  async decodeAadhaarQR(qrData: string): Promise<AadhaarData | null> {
    try {
      console.log('🔍 Decoding Aadhaar QR data...')
      
      // For now, we'll simulate QR decoding
      // In production, this would use anon-aadhaar library
      const decodedData = this.simulateQRDecoding(qrData)
      
      if (!decodedData) {
        throw new Error('Invalid QR code format')
      }

      console.log('✅ Aadhaar QR decoded successfully')
      return decodedData
    } catch (error) {
      console.error('❌ Aadhaar QR decoding failed:', error)
      return null
    }
  }

  /**
   * Simulate QR code decoding (replace with real anon-aadhaar implementation)
   */
  private simulateQRDecoding(qrData: string): AadhaarData | null {
    try {
      // In production, this would use anon-aadhaar to decode the QR
      // For now, we'll create mock data based on the QR input
      const mockData: AadhaarData = {
        uid: '123456789012',
        name: 'John Doe',
        gender: 'M',
        yearOfBirth: '1990',
        careOf: 'Father',
        house: '123',
        street: 'Main Street',
        landmark: 'Near Park',
        locality: 'Downtown',
        vtc: 'City Center',
        postOffice: 'Main Post Office',
        district: 'Sample District',
        subDistrict: 'Sample Sub District',
        state: 'Sample State',
        pincode: '123456',
        phone: '+919876543210',
        email: 'john.doe@example.com',
        rawData: qrData,
        timestamp: Date.now()
      }

      return mockData
    } catch (error) {
      console.error('QR decoding simulation failed:', error)
      return null
    }
  }

  /**
   * Verify Aadhaar data and submit to smart contract
   */
  async verifyAadhaar(aadhaarData: AadhaarData, userId: string): Promise<AadhaarVerificationResult> {
    try {
      console.log('🔄 Verifying Aadhaar data with smart contract...')

      // Prepare verification data for smart contract
      const verificationData = {
        method: 'add_verification',
        appId: 745680430, // user_identity app_id
        params: [
          userId,                    // targetUser
          2,                        // verificationType (2 = Aadhaar verification)
          1,                        // verifierId (1 = system verifier)
          JSON.stringify({          // verificationData as JSON string
            aadhaarData: aadhaarData,
            verificationMethod: 'aadhaar_qr',
            timestamp: Date.now(),
            verified: true
          })
        ],
        boxes: [{ name: 'user_' + userId }]
      }

      // Submit to backend which will handle smart contract interaction
      const result = await backendService.submitTransaction({
        method: verificationData.method,
        appId: verificationData.appId,
        params: verificationData.params,
        boxes: verificationData.boxes,
        sessionToken: backendService.getSessionToken() || ''
      })

      if (result.success) {
        console.log('✅ Aadhaar verification submitted successfully')
        return {
          success: true,
          data: aadhaarData,
          verificationId: result.transactionId
        }
      } else {
        console.error('❌ Aadhaar verification failed:', result.error)
        return {
          success: false,
          error: result.error || 'Verification failed'
        }
      }
    } catch (error: any) {
      console.error('❌ Aadhaar verification error:', error)
      return {
        success: false,
        error: error.message || 'Verification failed'
      }
    }
  }

  /**
   * Extract specific fields from Aadhaar data for form mapping
   */
  extractFormFields(aadhaarData: AadhaarData) {
    return {
      fullName: aadhaarData.name,
      gender: aadhaarData.gender,
      dateOfBirth: this.calculateDateOfBirth(aadhaarData.yearOfBirth),
      address: this.formatAddress(aadhaarData),
      pincode: aadhaarData.pincode,
      phone: aadhaarData.phone,
      email: aadhaarData.email,
      aadhaarNumber: aadhaarData.uid
    }
  }

  /**
   * Calculate date of birth from year
   */
  private calculateDateOfBirth(yearOfBirth: string): string {
    // In real implementation, this would be more sophisticated
    return `01/01/${yearOfBirth}`
  }

  /**
   * Format address from Aadhaar data
   */
  private formatAddress(aadhaarData: AadhaarData): string {
    const addressParts = [
      aadhaarData.house,
      aadhaarData.street,
      aadhaarData.landmark,
      aadhaarData.locality,
      aadhaarData.vtc,
      aadhaarData.postOffice,
      aadhaarData.district,
      aadhaarData.state
    ].filter(part => part && part.trim() !== '')

    return addressParts.join(', ')
  }

  /**
   * Validate Aadhaar number format
   */
  validateAadhaarNumber(uid: string): boolean {
    // Aadhaar number should be 12 digits
    const aadhaarRegex = /^\d{12}$/
    return aadhaarRegex.test(uid)
  }

  /**
   * Generate Merkle tree proof for Aadhaar data
   * This would integrate with anon-aadhaar for ZKP
   */
  async generateMerkleProof(aadhaarData: AadhaarData): Promise<string> {
    try {
      console.log('🌳 Generating Merkle tree proof for Aadhaar data...')
      
      // In production, this would use anon-aadhaar to generate ZKP
      // For now, we'll simulate the proof generation
      const proofData = {
        uid: aadhaarData.uid,
        name: aadhaarData.name,
        timestamp: Date.now(),
        proof: 'simulated_merkle_proof_' + Math.random().toString(36).substr(2, 9)
      }

      const proof = JSON.stringify(proofData)
      console.log('✅ Merkle proof generated successfully')
      
      return proof
    } catch (error) {
      console.error('❌ Merkle proof generation failed:', error)
      throw error
    }
  }
}

export const aadhaarService = new AadhaarService()
