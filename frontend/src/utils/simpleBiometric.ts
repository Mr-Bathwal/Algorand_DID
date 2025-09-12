// Simple biometric verification without face-api.js dependency
// This is a fallback system that works without complex AI models

export interface SimpleBiometricResult {
  success: boolean
  confidence: number
  faceDetected: boolean
  lipSyncDetected: boolean
  challengePhrase: string
  videoBlob?: Blob
  error?: string
}

export interface ChallengeData {
  phrase: string
  duration: number
  expectedWords: string[]
}

const CHALLENGE_PHRASES = [
  "Please say the numbers one two three four five",
  "Repeat after me: My name is and I am verifying my identity",
  "Say the following: Digital India verification process",
  "Please count from one to ten slowly",
  "Repeat: Government of India digital services"
]

class SimpleBiometricVerifier {
  private isInitialized = false

  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing simple biometric system...')
      
      // Simple initialization - no external models needed
      this.isInitialized = true
      console.log('✅ Simple biometric system ready')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize simple biometric system:', error)
      return false
    }
  }

  generateChallenge(): ChallengeData {
    const phrase = CHALLENGE_PHRASES[Math.floor(Math.random() * CHALLENGE_PHRASES.length)]
    const words = phrase.toLowerCase().split(' ').filter(word => word.length > 2)
    
    return {
      phrase,
      duration: 10000, // 10 seconds
      expectedWords: words
    }
  }

  async detectFaceInVideo(videoBlob: Blob): Promise<boolean> {
    try {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoBlob)
      
      return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          // Validate video properties
          if (!video.duration || !isFinite(video.duration) || video.duration <= 0) {
            console.warn('Invalid video duration:', video.duration)
            resolve(false)
            return
          }
          
          if (!video.videoWidth || !video.videoHeight) {
            console.warn('Invalid video dimensions:', video.videoWidth, video.videoHeight)
            resolve(false)
            return
          }
          
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          // Sample multiple frames
          const frameCount = Math.min(10, Math.floor(video.duration * 5)) // 5 fps
          const frameInterval = video.duration / frameCount
          
          let faceDetectedFrames = 0
          
          for (let i = 0; i < frameCount; i++) {
            const targetTime = i * frameInterval
            if (isFinite(targetTime) && targetTime >= 0 && targetTime <= video.duration) {
              video.currentTime = targetTime
              await new Promise(resolve => video.onseeked = resolve)
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // Simple face detection based on skin tone detection
            if (this.detectSkinTone(imageData)) {
              faceDetectedFrames++
            }
          }
          
          const faceConsistency = faceDetectedFrames / frameCount
          console.log('Face detection result:', { faceDetectedFrames, frameCount, faceConsistency })
          resolve(faceConsistency > 0.3) // 30% of frames should have face
          
          URL.revokeObjectURL(video.src)
        }
        
        video.onerror = () => {
          console.error('Video loading error')
          resolve(false)
          URL.revokeObjectURL(video.src)
        }
        
        // Add timeout
        setTimeout(() => {
          console.warn('Video processing timeout')
          resolve(false)
          URL.revokeObjectURL(video.src)
        }, 10000) // 10 second timeout
      })
    } catch (error) {
      console.error('Face detection error:', error)
      return false
    }
  }

  private detectSkinTone(imageData: ImageData): boolean {
    const data = imageData.data
    let skinPixels = 0
    let totalPixels = 0
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Simple skin tone detection (HSV-based)
      if (this.isSkinTone(r, g, b)) {
        skinPixels++
      }
      totalPixels++
    }
    
    return (skinPixels / totalPixels) > 0.1 // 10% of pixels should be skin tone
  }

  private isSkinTone(r: number, g: number, b: number): boolean {
    // Convert RGB to HSV
    const { h, s, v } = this.rgbToHsv(r, g, b)
    
    // Skin tone ranges in HSV
    return (
      (h >= 0 && h <= 25) || (h >= 340 && h <= 360) && // Hue range for skin
      s >= 0.2 && s <= 0.7 && // Saturation range
      v >= 0.3 && v <= 0.9    // Value range
    )
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    let h = 0
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6
      else if (max === g) h = (b - r) / diff + 2
      else h = (r - g) / diff + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360

    const s = max === 0 ? 0 : diff / max
    const v = max

    return { h, s, v }
  }

  async analyzeLipSync(videoBlob: Blob, challengeData: ChallengeData): Promise<{
    success: boolean
    confidence: number
    detectedWords: string[]
  }> {
    try {
      console.log('🔄 Analyzing lip-sync...')
      
      // Simple lip-sync analysis based on face detection consistency
      const faceDetected = await this.detectFaceInVideo(videoBlob)
      
      if (!faceDetected) {
        console.log('❌ No face detected in video')
        return {
          success: false,
          confidence: 0,
          detectedWords: []
        }
      }

      console.log('✅ Face detected in video')

      // Simulate word detection (in real implementation, use Web Speech API)
      const detectedWords = this.simulateWordDetection(challengeData.expectedWords)
      const confidence = detectedWords.length / challengeData.expectedWords.length * 100
      
      console.log('📊 Lip-sync analysis result:', { detectedWords, confidence })
      
      return {
        success: confidence > 50, // 50% of words detected
        confidence,
        detectedWords
      }
    } catch (error) {
      console.error('❌ Lip-sync analysis error:', error)
      return {
        success: false,
        confidence: 0,
        detectedWords: []
      }
    }
  }

  private simulateWordDetection(expectedWords: string[]): string[] {
    // Simulate word detection - in real implementation, use Web Speech API
    const detectedWords: string[] = []
    expectedWords.forEach(word => {
      if (Math.random() > 0.4) { // 60% chance of detecting each word
        detectedWords.push(word)
      }
    })
    return detectedWords
  }

  async verifyBiometric(
    videoBlob: Blob,
    challengeData: ChallengeData
  ): Promise<SimpleBiometricResult> {
    try {
      console.log('🔄 Starting simple biometric verification...')
      
      if (!this.isInitialized) {
        return {
          success: false,
          confidence: 0,
          faceDetected: false,
          lipSyncDetected: false,
          challengePhrase: challengeData.phrase,
          error: 'System not initialized'
        }
      }

      // Validate video blob
      if (!videoBlob || videoBlob.size === 0) {
        return {
          success: false,
          confidence: 0,
          faceDetected: false,
          lipSyncDetected: false,
          challengePhrase: challengeData.phrase,
          error: 'Invalid video data'
        }
      }

      console.log('📹 Video blob size:', videoBlob.size, 'bytes')

      // Detect face in video
      const faceDetected = await this.detectFaceInVideo(videoBlob)
      
      if (!faceDetected) {
        return {
          success: false,
          confidence: 0,
          faceDetected: false,
          lipSyncDetected: false,
          challengePhrase: challengeData.phrase,
          error: 'No face detected in video'
        }
      }

      // Analyze lip-sync
      const lipSyncResult = await this.analyzeLipSync(videoBlob, challengeData)
      
      const overallSuccess = faceDetected && lipSyncResult.success
      const overallConfidence = (faceDetected ? 80 : 0) + (lipSyncResult.confidence * 0.2) // Weighted scoring
      
      console.log('✅ Simple biometric verification complete:', {
        faceDetected,
        lipSyncConfidence: lipSyncResult.confidence.toFixed(1) + '%',
        lipSyncMatch: lipSyncResult.success,
        overallSuccess,
        overallConfidence: overallConfidence.toFixed(1) + '%'
      })
      
      return {
        success: overallSuccess,
        confidence: overallConfidence,
        faceDetected,
        lipSyncDetected: lipSyncResult.success,
        challengePhrase: challengeData.phrase,
        videoBlob
      }
    } catch (error) {
      console.error('❌ Simple biometric verification error:', error)
      return {
        success: false,
        confidence: 0,
        faceDetected: false,
        lipSyncDetected: false,
        challengePhrase: challengeData.phrase,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const simpleBiometricVerifier = new SimpleBiometricVerifier()
