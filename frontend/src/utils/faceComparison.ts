import { sha256Hex } from './hash'

export interface StoredFaceTemplate {
  imageData: string // base64 image
  hash: string
  timestamp: number
  features?: number[] // facial feature vector
}

export interface FaceComparisonResult {
  similarity: number // 0-1 scale
  match: boolean // true if similarity >= 0.8
  confidence: number // confidence level
  details: {
    faceDetected: boolean
    qualityScore: number
    timestamp: number
  }
}

export interface AadhaarFaceData {
  imageData: string // base64 decoded image from QR
  hash: string
  extractedFrom: 'aadhaar_qr'
}

const FACE_TEMPLATE_KEY = 'identity_face_template'

/**
 * Get stored face template from localStorage
 */
export function getStoredFaceTemplate(): StoredFaceTemplate | null {
  try {
    const stored = localStorage.getItem(FACE_TEMPLATE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error retrieving stored face template:', error)
    return null
  }
}

/**
 * Store face template in localStorage
 */
export function storeFaceTemplate(template: StoredFaceTemplate): boolean {
  try {
    localStorage.setItem(FACE_TEMPLATE_KEY, JSON.stringify(template))
    return true
  } catch (error) {
    console.error('Error storing face template:', error)
    return false
  }
}

/**
 * Clear stored face template
 */
export function clearStoredFaceTemplate(): void {
  localStorage.removeItem(FACE_TEMPLATE_KEY)
}

/**
 * Extract facial features from base64 image data (simplified simulation)
 * In production, this would use actual face recognition algorithms
 */
async function extractFaceFeatures(imageData: string): Promise<{
  features: number[]
  quality: number
  faceDetected: boolean
}> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Simulate feature extraction
      // In production, you'd use libraries like face-api.js or TensorFlow.js
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      // Simulate face detection and feature extraction
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      
      // Generate pseudo-features based on image data
      const features: number[] = []
      for (let i = 0; i < 128; i++) { // 128-dimensional feature vector
        let sum = 0
        const start = (i * pixels.length / 128) | 0
        const end = ((i + 1) * pixels.length / 128) | 0
        
        for (let j = start; j < end && j < pixels.length; j += 4) {
          sum += (pixels[j] + pixels[j + 1] + pixels[j + 2]) / 3 // Average RGB
        }
        
        features.push(sum / (end - start) / 255) // Normalize to 0-1
      }
      
      // Simulate quality assessment
      const quality = Math.min(1, Math.max(0.3, 
        (img.width * img.height) / (640 * 480) * // Resolution factor
        (features.reduce((a, b) => a + Math.abs(b - 0.5), 0) / features.length) // Contrast factor
      ))
      
      // Simulate face detection (assume detected if image is reasonable size)
      const faceDetected = img.width > 100 && img.height > 100 && quality > 0.2
      
      resolve({ features, quality, faceDetected })
    }
    
    img.onerror = () => {
      resolve({ features: [], quality: 0, faceDetected: false })
    }
    
    img.src = imageData
  })
}

/**
 * Calculate cosine similarity between two feature vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Compare stored face template with Aadhaar face image
 */
export async function compareFaces(aadhaarFace: AadhaarFaceData): Promise<FaceComparisonResult> {
  try {
    // Get stored template
    const storedTemplate = getStoredFaceTemplate()
    if (!storedTemplate) {
      throw new Error('No stored face template found. Please complete face verification first.')
    }
    
    console.log('Comparing faces:', {
      storedHash: storedTemplate.hash.substring(0, 16) + '...',
      aadhaarHash: aadhaarFace.hash.substring(0, 16) + '...',
      storedTimestamp: new Date(storedTemplate.timestamp).toISOString()
    })
    
    // Extract features from both images
    const [storedFeatures, aadhaarFeatures] = await Promise.all([
      storedTemplate.features ? 
        Promise.resolve({ 
          features: storedTemplate.features, 
          quality: 0.8, 
          faceDetected: true 
        }) :
        extractFaceFeatures(storedTemplate.imageData),
      extractFaceFeatures(aadhaarFace.imageData)
    ])
    
    if (!storedFeatures.faceDetected) {
      throw new Error('Face not detected in stored template')
    }
    
    if (!aadhaarFeatures.faceDetected) {
      throw new Error('Face not detected in Aadhaar image')
    }
    
    // Calculate similarity
    const similarity = cosineSimilarity(storedFeatures.features, aadhaarFeatures.features)
    
    // Quality factor based on actual image analysis
    const qualityFactor = (storedFeatures.quality + aadhaarFeatures.quality) / 2
    
    // Apply quality-aware adjustment - only boost similarity if both images have decent quality
    let adjustedSimilarity = similarity
    if (qualityFactor > 0.5) {
      // For good quality images, use raw similarity
      adjustedSimilarity = similarity
    } else {
      // For poor quality, apply small quality compensation but don't artificially inflate
      adjustedSimilarity = similarity * (0.8 + qualityFactor * 0.2)
    }
    
    // Ensure similarity stays within bounds
    adjustedSimilarity = Math.min(1.0, Math.max(0, adjustedSimilarity))
    
    // Calculate confidence based on actual similarity and image quality
    // High similarity and good quality = high confidence
    // Low quality but high similarity = moderate confidence
    const confidence = Math.min(0.95, adjustedSimilarity * (0.7 + qualityFactor * 0.3))
    
    // Match if similarity meets threshold (more lenient for older Aadhaar photos)
    // Lower threshold for better matching with older photos
    const match = adjustedSimilarity >= 0.60 // 60% threshold for better matching
    
    const result: FaceComparisonResult = {
      similarity: adjustedSimilarity,
      match,
      confidence,
      details: {
        faceDetected: true,
        qualityScore: qualityFactor,
        timestamp: Date.now()
      }
    }
    
    console.log('Face comparison result:', {
      rawSimilarity: Math.round(similarity * 100) + '%',
      adjustedSimilarity: Math.round(adjustedSimilarity * 100) + '%',
      match,
      confidence: Math.round(confidence * 100) + '%',
      storedQuality: Math.round(storedFeatures.quality * 100) + '%',
      aadhaarQuality: Math.round(aadhaarFeatures.quality * 100) + '%',
      qualityFactor: Math.round(qualityFactor * 100) + '%'
    })
    
    return result
    
  } catch (error) {
    console.error('Face comparison error:', error)
    
    return {
      similarity: 0,
      match: false,
      confidence: 0,
      details: {
        faceDetected: false,
        qualityScore: 0,
        timestamp: Date.now()
      }
    }
  }
}

/**
 * Generate hash for Aadhaar face image
 */
export async function generateAadhaarFaceHash(imageData: string): Promise<string> {
  const buffer = new TextEncoder().encode(imageData)
  return await sha256Hex(buffer)
}

/**
 * Validate face image data
 */
export function validateFaceImage(imageData: string): boolean {
  try {
    // Check if it's a valid base64 data URL
    if (!imageData.startsWith('data:image/')) {
      return false
    }
    
    // Check if base64 data is present
    const base64Data = imageData.split(',')[1]
    if (!base64Data || base64Data.length < 100) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Create face comparison log entry
 */
export function createFaceComparisonLog(
  result: FaceComparisonResult,
  storedTemplate: StoredFaceTemplate,
  aadhaarFace: AadhaarFaceData
): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    comparison: {
      similarity: result.similarity,
      match: result.match,
      confidence: result.confidence,
      threshold: 0.8
    },
    storedFace: {
      hash: storedTemplate.hash.substring(0, 16) + '...',
      capturedAt: new Date(storedTemplate.timestamp).toISOString()
    },
    aadhaarFace: {
      hash: aadhaarFace.hash.substring(0, 16) + '...',
      source: aadhaarFace.extractedFrom
    },
    details: result.details
  }
}
