import { sha256Hex } from './hash'

export interface BiometricVerificationData {
  faceHash: string
  videoHash: string
  audioHash: string
  phrase: string
  recognized: string
  speechSimilarity: number
  lipSyncScore: number
  combinedScore: number
  timestamp: number
  userAgent: string
  challenge: string
}

export interface VerificationSignature {
  hash: `0x${string}`
  data: BiometricVerificationData
  signature: `0x${string}`
  metadata: {
    version: string
    algorithm: string
    created: number
  }
}

/**
 * Generate a comprehensive verification signature for blockchain submission
 */
export async function generateBiometricSignature(
  faceHash: string,
  biometricData: any
): Promise<VerificationSignature> {
  // Create standardized verification payload
  const verificationData: BiometricVerificationData = {
    faceHash,
    videoHash: biometricData.videoHash || '',
    audioHash: biometricData.audioHash || '',
    phrase: biometricData.phrase || '',
    recognized: biometricData.recognized || '',
    speechSimilarity: biometricData.speechSimilarity || 0,
    lipSyncScore: biometricData.lipSyncScore || 0,
    combinedScore: biometricData.combinedScore || 0,
    timestamp: biometricData.timestamp || Date.now(),
    userAgent: navigator.userAgent,
    challenge: `challenge_${Date.now()}`
  }
  
  // Generate data hash
  const dataString = JSON.stringify(verificationData, Object.keys(verificationData).sort())
  const dataHash = await sha256Hex(new TextEncoder().encode(dataString))
  
  // Generate signature hash (includes additional entropy)
  const signaturePayload = {
    dataHash,
    timestamp: Date.now(),
    nonce: `nonce_${Date.now()}`,
    version: '1.0'
  }
  
  const signatureString = JSON.stringify(signaturePayload)
  const signature = await sha256Hex(new TextEncoder().encode(signatureString))
  
  return {
    hash: dataHash,
    data: verificationData,
    signature: signature,
    metadata: {
      version: '1.0',
      algorithm: 'SHA-256',
      created: Date.now()
    }
  }
}

/**
 * Prepare verification data for smart contract submission
 */
export function prepareSmartContractArgs(verificationSig: VerificationSignature): {
  faceHash: `0x${string}`
  proofData: `0x${string}`
  metadata: `0x${string}`
} {
  // Encode proof data as hex
  const proofDataString = JSON.stringify({
    signature: verificationSig.signature,
    combinedScore: verificationSig.data.combinedScore,
    speechSimilarity: verificationSig.data.speechSimilarity,
    lipSyncScore: verificationSig.data.lipSyncScore,
    timestamp: verificationSig.data.timestamp
  })
  
  // Encode metadata as hex
  const metadataString = JSON.stringify({
    version: verificationSig.metadata.version,
    algorithm: verificationSig.metadata.algorithm,
    phrase: verificationSig.data.phrase,
    videoHash: verificationSig.data.videoHash,
    audioHash: verificationSig.data.audioHash
  })
  
  return {
    faceHash: verificationSig.data.faceHash as `0x${string}`,
    proofData: `0x${Buffer.from(proofDataString).toString('hex')}` as `0x${string}`,
    metadata: `0x${Buffer.from(metadataString).toString('hex')}` as `0x${string}`
  }
}

/**
 * Validate biometric verification data before submission
 */
export function validateBiometricData(data: any): boolean {
  const required = [
    'lipSyncScore', 
    'combinedScore'
  ]
  
  // Check required fields
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      console.error(`Missing required field: ${field}`)
      return false
    }
  }
  
  // Validate score thresholds (lenient but not hardcoded)
  const lipSyncScore = data.lipSyncScore || 0
  const combinedScore = data.combinedScore || 0
  
  // Minimum thresholds for biometric verification
  const minLipSyncScore = 0.4 // 40% minimum lip movement
  const minCombinedScore = 0.5 // 50% minimum combined score
  
  const isValid = lipSyncScore >= minLipSyncScore && combinedScore >= minCombinedScore
  
  console.log('Biometric data validation:', {
    lipSyncScore: Math.round(lipSyncScore * 100) + '%',
    combinedScore: Math.round(combinedScore * 100) + '%',
    minLipSyncScore: Math.round(minLipSyncScore * 100) + '%',
    minCombinedScore: Math.round(minCombinedScore * 100) + '%',
    isValid
  })
  
  return isValid
}

/**
 * Create verification log entry for debugging
 */
export function createVerificationLog(
  verificationSig: VerificationSignature,
  contractResult?: any
): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    verification: {
      faceHash: verificationSig.data.faceHash,
      combinedScore: verificationSig.data.combinedScore,
      speechSimilarity: verificationSig.data.speechSimilarity,
      lipSyncScore: verificationSig.data.lipSyncScore,
      phrase: verificationSig.data.phrase,
      recognized: verificationSig.data.recognized
    },
    signature: verificationSig.signature,
    contractResult: contractResult || null,
    metadata: verificationSig.metadata
  }
}
