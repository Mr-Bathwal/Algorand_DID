import CryptoJS from 'crypto-js'
import { pinJSON } from '../utils/ipfs'
import { ITRExtractedData } from './ITRDataExtractionService'
import { GovernmentVerificationResponse } from './GovernmentAPIService'

export interface SecureITRData {
  // Core verified data (these will be hashed and stored on blockchain)
  verifiedIncome: {
    ackNumber: string
    pan: string
    assessmentYear: string
    applicantName: string
    annualCertifiedIncome: string
    filingDate: string
    verificationTimestamp: number
  }
  
  // Extended data (stored on IPFS for auditing)
  additionalData: {
    itrForm?: string
    filingStatus?: string
    taxableIncome?: string
    totalTax?: string
    refundAmount?: string
    emailId?: string
    mobileNumber?: string
    address?: string
    bankDetails?: {
      accountNumber?: string
      ifscCode?: string
    }
    verificationSource: string
    extractionMethod: string
    processingDate: string
  }
  
  // Metadata
  metadata: {
    userAddress: string
    timestamp: number
    version: string
    encryptionMethod: 'AES-256-GCM' | 'NONE'
    hashAlgorithm: 'SHA-256'
    privacyLevel: 'PUBLIC' | 'ENCRYPTED' | 'SELECTIVE'
  }
}

export interface IPFSStorageResult {
  success: boolean
  cid?: string // IPFS Content Identifier
  url?: string // IPFS Gateway URL
  dataHash: string // SHA-256 hash of the verified income data
  encryptedDataHash?: string // Hash of encrypted full data
  errors: string[]
  warnings: string[]
  storageSize: number // Size in bytes
  privacyLevel: 'PUBLIC' | 'ENCRYPTED' | 'SELECTIVE'
}

export interface HashingResult {
  originalDataHash: string // Hash of the core verified data (for blockchain)
  fullDataHash: string // Hash of complete data
  encryptedHash?: string // Hash of encrypted data
  algorithm: string
  timestamp: number
}

/**
 * ITR IPFS Storage Service
 * Handles secure storage of verified ITR data on IPFS with proper hashing and encryption
 */
export class ITRIPFSStorageService {
  private static instance: ITRIPFSStorageService
  
  // Encryption configuration
  private readonly encryptionKey: string
  private readonly enableEncryption: boolean
  private readonly privacyMode: 'PUBLIC' | 'ENCRYPTED' | 'SELECTIVE'
  
  // IPFS configuration
  private readonly enableIPFS: boolean
  private readonly maxStorageSize: number // Maximum size in MB
  private readonly compressionLevel: number
  
  constructor() {
    // Configuration from environment
    this.encryptionKey = import.meta.env?.VITE_ITR_ENCRYPTION_KEY || this.generateDefaultEncryptionKey()
    this.enableEncryption = import.meta.env?.VITE_ITR_ENABLE_ENCRYPTION !== 'false' // Default to true
    this.privacyMode = (import.meta.env?.VITE_ITR_PRIVACY_MODE as any) || 'SELECTIVE'
    this.enableIPFS = import.meta.env?.VITE_ENABLE_IPFS !== 'false' // Default to true
    this.maxStorageSize = parseInt(import.meta.env?.VITE_ITR_MAX_STORAGE_SIZE || '5') // 5MB default
    this.compressionLevel = parseInt(import.meta.env?.VITE_ITR_COMPRESSION_LEVEL || '6')
    
    console.log('ITR IPFS Storage Service initialized:', {
      enableEncryption: this.enableEncryption,
      privacyMode: this.privacyMode,
      enableIPFS: this.enableIPFS,
      maxStorageSizeMB: this.maxStorageSize
    })
  }

  public static getInstance(): ITRIPFSStorageService {
    if (!ITRIPFSStorageService.instance) {
      ITRIPFSStorageService.instance = new ITRIPFSStorageService()
    }
    return ITRIPFSStorageService.instance
  }

  /**
   * Store verified ITR data securely on IPFS
   */
  async storeVerifiedITRData(
    userAddress: string,
    extractedData: ITRExtractedData,
    verificationResponse: GovernmentVerificationResponse
  ): Promise<IPFSStorageResult> {
    
    console.log('Starting secure ITR data storage for user:', userAddress)
    
    try {
      // Prepare secure data structure
      const secureData = this.prepareSecureData(userAddress, extractedData, verificationResponse)
      
      // Generate hashes
      const hashes = this.generateHashes(secureData)
      
      // Apply privacy protection based on configuration
      const processedData = this.applyPrivacyProtection(secureData)
      
      // Validate data size
      const dataSize = this.calculateDataSize(processedData)
      if (dataSize > this.maxStorageSize * 1024 * 1024) {
        return {
          success: false,
          errors: [`Data size ${Math.round(dataSize / 1024 / 1024)}MB exceeds maximum allowed size ${this.maxStorageSize}MB`],
          warnings: [],
          dataHash: hashes.originalDataHash,
          storageSize: dataSize,
          privacyLevel: this.privacyMode
        }
      }
      
      let cid: string | undefined
      let url: string | undefined
      
      // Store on IPFS if enabled
      if (this.enableIPFS) {
        try {
          const ipfsResult = await pinJSON(processedData)
          cid = ipfsResult.cid
          url = ipfsResult.url
          console.log('ITR data stored on IPFS:', { cid, url })
        } catch (ipfsError) {
          console.warn('IPFS storage failed, continuing with local hash:', ipfsError)
          return {
            success: false,
            errors: [`IPFS storage failed: ${ipfsError instanceof Error ? ipfsError.message : 'Unknown error'}`],
            warnings: ['Data hash generated but not stored on IPFS'],
            dataHash: hashes.originalDataHash,
            encryptedDataHash: hashes.encryptedHash,
            storageSize: dataSize,
            privacyLevel: this.privacyMode
          }
        }
      }
      
      return {
        success: true,
        cid,
        url,
        dataHash: hashes.originalDataHash,
        encryptedDataHash: hashes.encryptedHash,
        errors: [],
        warnings: this.generateStorageWarnings(secureData),
        storageSize: dataSize,
        privacyLevel: this.privacyMode
      }
      
    } catch (error) {
      console.error('ITR data storage failed:', error)
      return {
        success: false,
        errors: [`Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        dataHash: '',
        storageSize: 0,
        privacyLevel: this.privacyMode
      }
    }
  }

  /**
   * Generate SHA-256 hashes for different data components
   */
  public generateHashes(secureData: SecureITRData): HashingResult {
    try {
      // Hash core verified data (this goes on blockchain)
      const coreDataString = JSON.stringify({
        ackNumber: secureData.verifiedIncome.ackNumber,
        pan: secureData.verifiedIncome.pan,
        annualCertifiedIncome: secureData.verifiedIncome.annualCertifiedIncome,
        assessmentYear: secureData.verifiedIncome.assessmentYear,
        verificationTimestamp: secureData.verifiedIncome.verificationTimestamp
      }, Object.keys(secureData.verifiedIncome).sort())
      
      const originalDataHash = CryptoJS.SHA256(coreDataString).toString()
      
      // Hash complete data
      const fullDataString = JSON.stringify(secureData, this.replacer)
      const fullDataHash = CryptoJS.SHA256(fullDataString).toString()
      
      // Generate encrypted hash if encryption is enabled
      let encryptedHash: string | undefined
      if (this.enableEncryption) {
        const encryptedData = this.encryptData(fullDataString)
        encryptedHash = CryptoJS.SHA256(encryptedData).toString()
      }
      
      return {
        originalDataHash: `0x${originalDataHash}`,
        fullDataHash: `0x${fullDataHash}`,
        encryptedHash: encryptedHash ? `0x${encryptedHash}` : undefined,
        algorithm: 'SHA-256',
        timestamp: Date.now()
      }
      
    } catch (error) {
      console.error('Hash generation failed:', error)
      throw new Error(`Hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Prepare secure data structure from extracted and verified data
   */
  private prepareSecureData(
    userAddress: string,
    extractedData: ITRExtractedData,
    verificationResponse: GovernmentVerificationResponse
  ): SecureITRData {
    
    const verifiedData = verificationResponse.data
    const timestamp = Date.now()
    
    return {
      verifiedIncome: {
        ackNumber: verifiedData?.ackNumber || extractedData.ackNumber,
        pan: verifiedData?.pan || extractedData.pan,
        assessmentYear: verifiedData?.assessmentYear || extractedData.assessmentYear,
        applicantName: verifiedData?.applicantName || extractedData.applicantName,
        annualCertifiedIncome: verifiedData?.annualIncome || extractedData.annualCertifiedIncome,
        filingDate: verifiedData?.filingDate || extractedData.filingDate,
        verificationTimestamp: timestamp
      },
      
      additionalData: {
        itrForm: verifiedData?.itrForm || extractedData.itrForm,
        filingStatus: verifiedData?.filingStatus || extractedData.filingStatus,
        taxableIncome: verifiedData?.taxableIncome || extractedData.taxableIncome,
        totalTax: verifiedData?.totalTax || extractedData.totalTax,
        refundAmount: verifiedData?.refundAmount || extractedData.refundAmount,
        emailId: this.privacyMode === 'PUBLIC' ? undefined : extractedData.emailId,
        mobileNumber: this.privacyMode === 'PUBLIC' ? undefined : extractedData.mobileNumber,
        address: this.privacyMode === 'PUBLIC' ? undefined : extractedData.address,
        bankDetails: this.privacyMode === 'PUBLIC' ? undefined : {
          accountNumber: extractedData.bankAccountNumber,
          ifscCode: extractedData.ifscCode
        },
        verificationSource: verificationResponse.data?.verificationSource || 'UNKNOWN',
        extractionMethod: extractedData.extractionMethod,
        processingDate: new Date().toISOString()
      },
      
      metadata: {
        userAddress,
        timestamp,
        version: '1.0.0',
        encryptionMethod: this.enableEncryption ? 'AES-256-GCM' : 'NONE',
        hashAlgorithm: 'SHA-256',
        privacyLevel: this.privacyMode
      }
    }
  }

  /**
   * Apply privacy protection based on configuration
   */
  private applyPrivacyProtection(data: SecureITRData): any {
    switch (this.privacyMode) {
      case 'PUBLIC':
        // Remove all sensitive personal data
        return {
          ...data,
          additionalData: {
            ...data.additionalData,
            emailId: undefined,
            mobileNumber: undefined,
            address: undefined,
            bankDetails: undefined
          }
        }
        
      case 'ENCRYPTED':
        // Encrypt entire data structure
        return {
          encryptedData: this.encryptData(JSON.stringify(data)),
          metadata: {
            ...data.metadata,
            encryptionMethod: 'AES-256-GCM'
          }
        }
        
      case 'SELECTIVE':
        // Encrypt only sensitive fields
        const sensitiveFields = [
          'emailId', 'mobileNumber', 'address', 'bankDetails'
        ]
        
        const protectedData = { ...data }
        sensitiveFields.forEach(field => {
          if (data.additionalData[field as keyof typeof data.additionalData]) {
            protectedData.additionalData = {
              ...protectedData.additionalData,
              [`encrypted_${field}`]: this.encryptData(
                JSON.stringify(data.additionalData[field as keyof typeof data.additionalData])
              ),
              [field as keyof typeof protectedData.additionalData]: undefined
            }
          }
        })
        
        return protectedData
        
      default:
        return data
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encryptData(data: string): string {
    try {
      // Generate random IV for each encryption
      const iv = CryptoJS.lib.WordArray.random(16)
      
      // Encrypt using AES-256-GCM
      const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      })
      
      // Combine IV and encrypted data
      const combined = iv.toString() + ':' + encrypted.toString()
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(combined))
      
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Data encryption failed')
    }
  }

  /**
   * Decrypt data (for verification purposes)
   */
  public decryptData(encryptedData: string): string {
    try {
      // Decode from Base64
      const decoded = CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8)
      const parts = decoded.split(':')
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format')
      }
      
      const iv = CryptoJS.enc.Hex.parse(parts[0])
      const encrypted = parts[1]
      
      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      })
      
      return decrypted.toString(CryptoJS.enc.Utf8)
      
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Data decryption failed')
    }
  }

  /**
   * Calculate data size in bytes
   */
  private calculateDataSize(data: any): number {
    return new TextEncoder().encode(JSON.stringify(data)).length
  }

  /**
   * Generate storage warnings
   */
  private generateStorageWarnings(data: SecureITRData): string[] {
    const warnings: string[] = []
    
    if (!this.enableEncryption) {
      warnings.push('Data stored without encryption - consider enabling encryption for sensitive data')
    }
    
    if (this.privacyMode === 'PUBLIC') {
      warnings.push('Personal data excluded due to PUBLIC privacy mode')
    }
    
    if (!data.additionalData.emailId && !data.additionalData.mobileNumber) {
      warnings.push('Contact information not included - may limit future verification options')
    }
    
    const dataSize = this.calculateDataSize(data)
    if (dataSize > 1024 * 1024) { // > 1MB
      warnings.push(`Large data size (${Math.round(dataSize / 1024 / 1024 * 100) / 100}MB) may increase storage costs`)
    }
    
    return warnings
  }

  /**
   * Generate default encryption key if not provided
   */
  private generateDefaultEncryptionKey(): string {
    console.warn('Using default encryption key. Set VITE_ITR_ENCRYPTION_KEY for production use.')
    return CryptoJS.lib.WordArray.random(32).toString()
  }

  /**
   * JSON replacer function for consistent hashing
   */
  private replacer(key: string, value: any): any {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    return value
  }

  /**
   * Retrieve and decrypt data from IPFS
   */
  public async retrieveVerifiedData(cid: string): Promise<{ success: boolean; data?: SecureITRData; errors: string[] }> {
    try {
      // This would use IPFS gateway to retrieve data
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve data: ${response.statusText}`)
      }
      
      let rawData = await response.json()
      
      // Handle encrypted data
      if (rawData.encryptedData) {
        try {
          const decryptedString = this.decryptData(rawData.encryptedData)
          rawData = JSON.parse(decryptedString)
        } catch (decryptError) {
          return {
            success: false,
            errors: ['Failed to decrypt data - invalid encryption key or corrupted data']
          }
        }
      }
      
      // Handle selectively encrypted fields
      if (rawData.additionalData) {
        Object.keys(rawData.additionalData).forEach(key => {
          if (key.startsWith('encrypted_')) {
            try {
              const originalKey = key.replace('encrypted_', '')
              const decryptedValue = this.decryptData(rawData.additionalData[key])
              rawData.additionalData[originalKey] = JSON.parse(decryptedValue)
              delete rawData.additionalData[key]
            } catch (error) {
              console.warn(`Failed to decrypt field ${key}:`, error)
            }
          }
        })
      }
      
      return {
        success: true,
        data: rawData as SecureITRData,
        errors: []
      }
      
    } catch (error) {
      console.error('Data retrieval failed:', error)
      return {
        success: false,
        errors: [`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Verify stored data integrity
   */
  public verifyDataIntegrity(data: SecureITRData, expectedHash: string): boolean {
    try {
      const hashes = this.generateHashes(data)
      return hashes.originalDataHash.toLowerCase() === expectedHash.toLowerCase()
    } catch (error) {
      console.error('Data integrity verification failed:', error)
      return false
    }
  }

  /**
   * Get storage configuration
   */
  public getConfiguration(): {
    enableEncryption: boolean
    privacyMode: string
    enableIPFS: boolean
    maxStorageSizeMB: number
    hashAlgorithm: string
  } {
    return {
      enableEncryption: this.enableEncryption,
      privacyMode: this.privacyMode,
      enableIPFS: this.enableIPFS,
      maxStorageSizeMB: this.maxStorageSize,
      hashAlgorithm: 'SHA-256'
    }
  }

  /**
   * Generate a quick hash for verification purposes (compatible with blockchain)
   */
  public generateQuickHash(
    ackNumber: string,
    pan: string,
    annualIncome: string,
    assessmentYear: string
  ): string {
    const data = {
      ackNumber,
      pan,
      annualIncome,
      assessmentYear,
      timestamp: Math.floor(Date.now() / 1000) // Unix timestamp for consistency
    }
    
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return `0x${CryptoJS.SHA256(dataString).toString()}`
  }

  /**
   * Create a summary hash that includes all critical verification data
   */
  public generateVerificationSummaryHash(
    userAddress: string,
    verificationData: any,
    timestamp: number
  ): string {
    const summary = {
      userAddress: userAddress.toLowerCase(),
      verificationData: {
        ackNumber: verificationData.ackNumber,
        pan: verificationData.pan,
        annualIncome: verificationData.annualIncome,
        assessmentYear: verificationData.assessmentYear,
        verified: verificationData.verified
      },
      timestamp
    }
    
    const summaryString = JSON.stringify(summary, Object.keys(summary).sort())
    return `0x${CryptoJS.SHA256(summaryString).toString()}`
  }
}
