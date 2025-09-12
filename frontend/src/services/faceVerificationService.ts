// Face Verification Service for Smart Contract Integration
import { backendService } from './backendService'
import { generateFaceHash } from '../utils/hashUtils'

export interface FaceVerificationData {
  faceHash: string
  landmarks: number[]
  confidence: number
  timestamp: number
  userId: string
}

export interface VerificationResult {
  success: boolean
  transactionId?: string
  faceHash: string
  verificationId: string
  error?: string
}

class FaceVerificationService {
  private static instance: FaceVerificationService

  public static getInstance(): FaceVerificationService {
    if (!FaceVerificationService.instance) {
      FaceVerificationService.instance = new FaceVerificationService()
    }
    return FaceVerificationService.instance
  }

  /**
   * Submit face verification (DEPRECATED - use IPFS + checklist approach)
   * This method is kept for backward compatibility but should not be used
   */
  async submitFaceVerification(data: FaceVerificationData): Promise<VerificationResult> {
    console.warn('⚠️ submitFaceVerification is deprecated. Use IPFS + markVerificationComplete instead.')
    
    // Return mock success for backward compatibility
    return {
      success: true,
      transactionId: 'deprecated_method',
      faceHash: data.faceHash,
      verificationId: 'deprecated_method'
    }
  }

  /**
   * Get face verification status from smart contract
   */
  async getFaceVerificationStatus(userId: string): Promise<{
    isVerified: boolean
    faceHash?: string
    verificationDate?: number
    confidence?: number
  }> {
    try {
      const result = await backendService.getVerificationStatus()
      
      return {
        isVerified: result.faceVerified || false,
        faceHash: result.faceHash,
        verificationDate: result.verificationDate,
        confidence: result.confidence
      }
    } catch (error: any) {
      console.error('Get verification status error:', error)
      return {
        isVerified: false
      }
    }
  }

  /**
   * Verify face against stored hash (for authentication)
   */
  async verifyFaceAgainstStored(faceHash: string, userId: string): Promise<boolean> {
    try {
      const status = await this.getFaceVerificationStatus(userId)
      
      if (!status.isVerified || !status.faceHash) {
        return false
      }

      // Simple hash comparison (in production, use more sophisticated matching)
      return faceHash === status.faceHash
    } catch (error: any) {
      console.error('Face verification against stored error:', error)
      return false
    }
  }

  /**
   * Generate a unique face hash from landmarks
   */
  generateFaceHash(landmarks: number[]): string {
    try {
      // Use CSP-compatible hash generation
      return generateFaceHash(landmarks, 1.0)
    } catch (error) {
      console.error('Face hash generation error:', error)
      throw new Error('Failed to generate face hash')
    }
  }

  /**
   * Validate face verification data
   */
  validateFaceData(data: FaceVerificationData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.faceHash || data.faceHash.length < 32) {
      errors.push('Invalid face hash')
    }

    // For simple face verification, landmarks are optional
    if (data.landmarks && data.landmarks.length > 0 && data.landmarks.length < 10) {
      errors.push('Insufficient facial landmarks (minimum 10 required)')
    }

    if (data.confidence < 0.5) {
      errors.push('Face confidence too low')
    }

    if (!data.userId) {
      errors.push('User ID is required')
    }

    if (data.timestamp <= 0) {
      errors.push('Invalid timestamp')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<{
    totalVerifications: number
    successfulVerifications: number
    averageConfidence: number
    lastVerificationDate?: number
  }> {
    try {
      // This would typically come from the smart contract or backend
      return {
        totalVerifications: 0,
        successfulVerifications: 0,
        averageConfidence: 0
      }
    } catch (error: any) {
      console.error('Get verification stats error:', error)
      return {
        totalVerifications: 0,
        successfulVerifications: 0,
        averageConfidence: 0
      }
    }
  }
}

export const faceVerificationService = FaceVerificationService.getInstance()
