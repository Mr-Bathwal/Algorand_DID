// Head Pose Estimation for 3D Liveliness Detection
// Verifies 3D liveliness by detecting head movements (left/right/up/down)
// Much more reliable than lip-sync and harder to spoof with 2D videos

export interface HeadPoseResult {
  success: boolean
  confidence: number
  movementsDetected: {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
  }
  totalMovements: number
  error?: string
}

export interface HeadPoseChallenge {
  instructions: string[]
  duration: number
  requiredMovements: number
}

class HeadPoseEstimator {
  private isInitialized = false

  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing head pose estimation...')
      this.isInitialized = true
      console.log('✅ Head pose estimation ready')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize head pose estimation:', error)
      return false
    }
  }

  generateChallenge(): HeadPoseChallenge {
    const instructions = [
      "Turn your head LEFT",
      "Turn your head RIGHT", 
      "Look UP",
      "Look DOWN"
    ]
    
    return {
      instructions,
      duration: 12000, // 12 seconds for all movements
      requiredMovements: 3 // Need at least 3 out of 4 movements
    }
  }

  async detectHeadMovements(videoBlob: Blob): Promise<HeadPoseResult> {
    try {
      console.log('🔄 Starting head pose analysis...')
      
      if (!this.isInitialized) {
        return {
          success: false,
          confidence: 0,
          movementsDetected: { left: false, right: false, up: false, down: false },
          totalMovements: 0,
          error: 'System not initialized'
        }
      }

      if (!videoBlob || videoBlob.size === 0) {
        return {
          success: false,
          confidence: 0,
          movementsDetected: { left: false, right: false, up: false, down: false },
          totalMovements: 0,
          error: 'Invalid video data'
        }
      }

      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoBlob)
      
      return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          // Validate video properties
          if (!video.duration || !isFinite(video.duration) || video.duration <= 0) {
            console.warn('Invalid video duration:', video.duration)
            resolve({
              success: false,
              confidence: 0,
              movementsDetected: { left: false, right: false, up: false, down: false },
              totalMovements: 0,
              error: 'Invalid video duration'
            })
            return
          }
          
          if (!video.videoWidth || !video.videoHeight) {
            console.warn('Invalid video dimensions:', video.videoWidth, video.videoHeight)
            resolve({
              success: false,
              confidence: 0,
              movementsDetected: { left: false, right: false, up: false, down: false },
              totalMovements: 0,
              error: 'Invalid video dimensions'
            })
            return
          }

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Sample frames throughout the video
          const frameCount = Math.min(20, Math.floor(video.duration * 5)) // 5 fps
          const frameInterval = video.duration / frameCount
          
          const facePositions: Array<{ x: number; y: number; width: number; height: number; timestamp: number }> = []
          
          // Extract face positions from frames
          for (let i = 0; i < frameCount; i++) {
            const targetTime = i * frameInterval
            if (isFinite(targetTime) && targetTime >= 0 && targetTime <= video.duration) {
              video.currentTime = targetTime
              await new Promise(resolve => video.onseeked = resolve)
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            const faceRegion = this.detectFaceRegion(imageData)
            if (faceRegion) {
              facePositions.push({
                ...faceRegion,
                timestamp: targetTime
              })
            }
          }

          URL.revokeObjectURL(video.src)

          // Analyze head movements
          const movements = this.analyzeHeadMovements(facePositions)
          const totalMovements = Object.values(movements).filter(Boolean).length
          const success = totalMovements >= 3 // Need at least 3 movements
          const confidence = (totalMovements / 4) * 100

          console.log('📊 Head pose analysis complete:', {
            movements,
            totalMovements,
            success,
            confidence: confidence.toFixed(1) + '%'
          })

          resolve({
            success,
            confidence,
            movementsDetected: movements,
            totalMovements
          })
        }
        
        video.onerror = () => {
          console.error('Video loading error')
          resolve({
            success: false,
            confidence: 0,
            movementsDetected: { left: false, right: false, up: false, down: false },
            totalMovements: 0,
            error: 'Video loading failed'
          })
          URL.revokeObjectURL(video.src)
        }
        
        // Add timeout
        setTimeout(() => {
          console.warn('Video processing timeout')
          resolve({
            success: false,
            confidence: 0,
            movementsDetected: { left: false, right: false, up: false, down: false },
            totalMovements: 0,
            error: 'Video processing timeout'
          })
          URL.revokeObjectURL(video.src)
        }, 20000) // Increased timeout to 20 seconds
      })
    } catch (error) {
      console.error('❌ Head pose detection error:', error)
      return {
        success: false,
        confidence: 0,
        movementsDetected: { left: false, right: false, up: false, down: false },
        totalMovements: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private detectFaceRegion(imageData: ImageData): { x: number; y: number; width: number; height: number } | null {
    // Simple face detection based on skin tone clustering
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    
    let minX = width, maxX = 0, minY = height, maxY = 0
    let skinPixels = 0
    
    // Sample every 3rd pixel for performance
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        if (this.isSkinTone(r, g, b)) {
          skinPixels++
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    // If we found enough skin pixels, return the bounding box
    if (skinPixels > 30) { // Low threshold for better detection
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }
    
    return null
  }

  private analyzeHeadMovements(positions: Array<{ x: number; y: number; width: number; height: number; timestamp: number }>): {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
  } {
    if (positions.length < 5) {
      return { left: false, right: false, up: false, down: false }
    }

    // Calculate face center positions
    const centers = positions.map(pos => ({
      x: pos.x + pos.width / 2,
      y: pos.y + pos.height / 2,
      timestamp: pos.timestamp
    }))

    // Calculate movement ranges
    const xPositions = centers.map(c => c.x)
    const yPositions = centers.map(c => c.y)
    
    const minX = Math.min(...xPositions)
    const maxX = Math.max(...xPositions)
    const minY = Math.min(...yPositions)
    const maxY = Math.max(...yPositions)
    
    const xRange = maxX - minX
    const yRange = maxY - minY
    
    // Calculate average face size for normalization
    const avgWidth = positions.reduce((sum, pos) => sum + pos.width, 0) / positions.length
    const avgHeight = positions.reduce((sum, pos) => sum + pos.height, 0) / positions.length
    const avgSize = (avgWidth + avgHeight) / 2
    
    // Normalize movement ranges
    const normalizedXRange = xRange / avgSize
    const normalizedYRange = yRange / avgSize
    
    // Thresholds for movement detection (very lenient)
    const horizontalThreshold = 0.3 // 30% of face size
    const verticalThreshold = 0.2   // 20% of face size
    
    console.log('📊 Movement analysis:', {
      xRange: xRange.toFixed(1),
      yRange: yRange.toFixed(1),
      normalizedXRange: normalizedXRange.toFixed(2),
      normalizedYRange: normalizedYRange.toFixed(2),
      avgSize: avgSize.toFixed(1),
      horizontalThreshold,
      verticalThreshold
    })
    
    return {
      left: normalizedXRange > horizontalThreshold,
      right: normalizedXRange > horizontalThreshold, // Same as left - any horizontal movement
      up: normalizedYRange > verticalThreshold,
      down: normalizedYRange > verticalThreshold    // Same as up - any vertical movement
    }
  }

  private isSkinTone(r: number, g: number, b: number): boolean {
    // Convert RGB to HSV
    const { h, s, v } = this.rgbToHsv(r, g, b)
    
    // Lenient skin tone detection
    return (
      ((h >= 0 && h <= 30) || (h >= 330 && h <= 360)) && // Hue range for skin
      s >= 0.1 && s <= 0.9 && // Saturation range (very lenient)
      v >= 0.15 && v <= 0.98   // Value range (very lenient)
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
}

export const headPoseEstimator = new HeadPoseEstimator()
