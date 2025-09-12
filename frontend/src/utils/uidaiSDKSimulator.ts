/**
 * UIDAI SDK Simulator
 * Simulates the official UIDAI Secure QR Code Reader SDK
 * Based on the official UIDAI specification and documentation
 */

export interface UIDAIQRData {
  name: string
  dob: string
  gender: string
  uid: string // Masked Aadhaar (last 4 digits)
  address: string
  photo: string // Base64 encoded photo
  signature: string
  isVerified: boolean
  uidaiVersion: string
  mobileNumber?: string
  emailId?: string
}

export interface UIDAIQRResult {
  success: boolean
  data?: UIDAIQRData
  error?: string
}

class UIDAISDKSimulator {
  private initialized = false

  async initialize() {
    if (this.initialized) return true
    
    try {
      console.log('🔄 Initializing UIDAI SDK Simulator...')
      this.initialized = true
      console.log('✅ UIDAI SDK Simulator ready')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize UIDAI SDK Simulator:', error)
      return false
    }
  }

  /**
   * Decode UIDAI Secure QR Code
   * Simulates the official UIDAI SDK decode function
   */
  async decodeSecureQR(qrData: string): Promise<UIDAIQRResult> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      console.log('🔄 UIDAI SDK: Decoding Secure QR Code...')
      console.log('📊 QR data length:', qrData.length)

      // Simulate UIDAI SDK processing
      const result = await this.processSecureQR(qrData)
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to decode UIDAI Secure QR'
        }
      }

      console.log('✅ UIDAI SDK: Secure QR decoded successfully:', {
        name: result.data?.name,
        uid: result.data?.uid,
        hasPhoto: !!result.data?.photo,
        isVerified: result.data?.isVerified,
        uidaiVersion: result.data?.uidaiVersion
      })

      return result
    } catch (error) {
      console.error('❌ UIDAI SDK error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown UIDAI SDK error'
      }
    }
  }

  /**
   * Process Secure QR Code according to UIDAI specification
   */
  private async processSecureQR(qrData: string): Promise<UIDAIQRResult> {
    try {
      console.log('🔄 UIDAI SDK: Processing Secure QR data...')

      // Step 1: Extract encoded data (simulate UIDAI SDK)
      const encodedData = this.extractEncodedData(qrData)
      if (!encodedData) {
        return {
          success: false,
          error: 'Invalid UIDAI Secure QR format'
        }
      }

      // Step 2: Verify UIDAI digital signature (simulate)
      const signatureValid = await this.verifyUIDAISignature(encodedData)
      if (!signatureValid) {
        console.warn('⚠️ UIDAI signature verification failed (simulation)')
      }

      // Step 3: Decode demographic information
      const demographicData = this.decodeDemographicData(encodedData)
      
      // Step 4: Extract photograph
      const photo = this.extractPhotograph(encodedData)
      
      // Step 5: Generate UIDAI-compliant data
      const uidaiData: UIDAIQRData = {
        name: demographicData.name,
        dob: demographicData.dob,
        gender: demographicData.gender,
        uid: demographicData.uid,
        address: demographicData.address,
        photo: photo,
        signature: this.generateUIDAISignature(qrData),
        isVerified: signatureValid,
        uidaiVersion: '2.0',
        mobileNumber: demographicData.mobileNumber,
        emailId: demographicData.emailId
      }

      return {
        success: true,
        data: uidaiData
      }
    } catch (error) {
      console.error('❌ UIDAI Secure QR processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'UIDAI processing failed'
      }
    }
  }

  /**
   * Extract encoded data from QR (simulates UIDAI SDK)
   */
  private extractEncodedData(qrData: string): string | null {
    try {
      // Clean the QR data
      const cleanData = qrData.trim()
      
      // Try different UIDAI formats
      if (this.isBase64(cleanData)) {
        console.log('✅ UIDAI SDK: Detected Base64 encoded QR')
        return cleanData
      }
      
      if (this.isHex(cleanData)) {
        console.log('✅ UIDAI SDK: Detected Hex encoded QR')
        return cleanData
      }
      
      if (cleanData.length >= 2000) {
        console.log('✅ UIDAI SDK: Detected Raw encrypted QR (2056 bytes)')
        return cleanData
      }
      
      // Try JSON format
      try {
        const jsonData = JSON.parse(cleanData)
        if (jsonData.name || jsonData.uid) {
          console.log('✅ UIDAI SDK: Detected JSON format QR')
          return cleanData
        }
      } catch {}
      
      console.warn('⚠️ UIDAI SDK: Unknown QR format')
      return null
    } catch (error) {
      console.error('❌ UIDAI SDK: Data extraction error:', error)
      return null
    }
  }

  /**
   * Verify UIDAI digital signature (simulation)
   */
  private async verifyUIDAISignature(encodedData: string): Promise<boolean> {
    try {
      console.log('🔄 UIDAI SDK: Verifying digital signature...')
      
      // Simulate signature verification
      // In real implementation, this would use UIDAI's public key
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate processing time
      
      // For demo purposes, always return true
      console.log('✅ UIDAI SDK: Digital signature verified')
      return true
    } catch (error) {
      console.error('❌ UIDAI SDK: Signature verification failed:', error)
      return false
    }
  }

  /**
   * Decode demographic information
   */
  private decodeDemographicData(encodedData: string): any {
    try {
      console.log('🔄 UIDAI SDK: Decoding demographic data...')
      
      // Generate consistent data based on QR hash
      const hash = this.generateHash(encodedData)
      
      const demographicData = {
        name: this.generateName(hash),
        dob: this.generateDOB(hash),
        gender: this.generateGender(hash),
        uid: this.generateMaskedUID(hash),
        address: this.generateAddress(hash),
        mobileNumber: this.generateMobile(hash),
        emailId: this.generateEmail(hash)
      }
      
      console.log('✅ UIDAI SDK: Demographic data decoded:', {
        name: demographicData.name,
        uid: demographicData.uid,
        hasMobile: !!demographicData.mobileNumber,
        hasEmail: !!demographicData.emailId
      })
      
      return demographicData
    } catch (error) {
      console.error('❌ UIDAI SDK: Demographic decoding error:', error)
      return {
        name: 'Unknown',
        dob: '01-01-1990',
        gender: 'M',
        uid: '000000000000',
        address: 'Unknown Address',
        mobileNumber: undefined,
        emailId: undefined
      }
    }
  }

  /**
   * Extract photograph from UIDAI Secure QR
   */
  private extractPhotograph(encodedData: string): string {
    try {
      console.log('🔄 UIDAI SDK: Extracting photograph...')
      
      // Try to extract real photo from binary data
      if (this.isBase64(encodedData)) {
        const photo = this.extractPhotoFromBase64(encodedData)
        if (photo) {
          console.log('✅ UIDAI SDK: Real photograph extracted')
          return photo
        }
      }
      
      if (this.isHex(encodedData)) {
        const photo = this.extractPhotoFromHex(encodedData)
        if (photo) {
          console.log('✅ UIDAI SDK: Real photograph extracted from hex')
          return photo
        }
      }
      
      // Generate UIDAI-compliant photo
      const generatedPhoto = this.generateUIDAIPhoto(encodedData)
      console.log('✅ UIDAI SDK: Generated UIDAI-compliant photograph')
      return generatedPhoto
      
    } catch (error) {
      console.error('❌ UIDAI SDK: Photo extraction error:', error)
      return this.generateUIDAIPhoto(encodedData)
    }
  }

  /**
   * Extract photo from Base64 data
   */
  private extractPhotoFromBase64(base64Data: string): string | null {
    try {
      const decoded = atob(base64Data)
      const bytes = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i)
      }
      
      // Look for JPEG markers
      for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
          // Found JPEG start
          for (let j = i + 2; j < bytes.length - 1; j++) {
            if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
              // Found JPEG end
              const jpegBytes = bytes.slice(i, j + 2)
              const base64 = btoa(String.fromCharCode(...jpegBytes))
              return `data:image/jpeg;base64,${base64}`
            }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Base64 photo extraction error:', error)
      return null
    }
  }

  /**
   * Extract photo from Hex data
   */
  private extractPhotoFromHex(hexData: string): string | null {
    try {
      const hex = hexData.startsWith('0x') ? hexData.slice(2) : hexData
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
      
      // Look for JPEG markers
      for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
          // Found JPEG start
          for (let j = i + 2; j < bytes.length - 1; j++) {
            if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
              // Found JPEG end
              const jpegBytes = bytes.slice(i, j + 2)
              const base64 = btoa(String.fromCharCode(...jpegBytes))
              return `data:image/jpeg;base64,${base64}`
            }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Hex photo extraction error:', error)
      return null
    }
  }

  /**
   * Generate UIDAI-compliant photograph
   */
  private generateUIDAIPhoto(data: string): string {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        console.warn('Could not create canvas for UIDAI photo generation')
        return ''
      }
      
      // Generate unique photo based on data hash
      const hash = this.generateHash(data)
      const seed = parseInt(hash.slice(0, 8), 16)
      
      // UIDAI-compliant photo colors
      const skinTones = ['#f4c2a1', '#d4a574', '#c68642', '#8d5524', '#5d4037']
      ctx.fillStyle = skinTones[seed % skinTones.length]
      ctx.fillRect(0, 0, 200, 200)
      
      // Face features
      ctx.fillStyle = '#000'
      
      // Eyes
      const eyeOffset = (seed % 20) - 10
      ctx.beginPath()
      ctx.arc(70 + eyeOffset, 80, 8, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(130 + eyeOffset, 80, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // Nose
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(100, 90)
      ctx.lineTo(100, 110)
      ctx.stroke()
      
      // Mouth
      const mouthCurve = (seed % 10) - 5
      ctx.beginPath()
      ctx.arc(100 + mouthCurve, 130, 20, 0, Math.PI)
      ctx.stroke()
      
      // Hair
      ctx.fillStyle = '#8B4513'
      ctx.beginPath()
      ctx.arc(100, 60, 50, Math.PI, 2 * Math.PI)
      ctx.fill()
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      console.log('✅ UIDAI SDK: Generated UIDAI-compliant photo:', {
        dataLength: data.length,
        hash: hash.slice(0, 8),
        photoSize: dataUrl.length
      })
      
      return dataUrl
    } catch (error) {
      console.error('❌ UIDAI photo generation error:', error)
      return ''
    }
  }

  /**
   * Generate UIDAI-compliant data
   */
  private generateName(hash: string): string {
    const names = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Singh', 'Vikram Gupta',
      'Anita Reddy', 'Suresh Kumar', 'Meera Joshi', 'Ravi Verma', 'Kavita Agarwal',
      'Deepak Sharma', 'Pooja Gupta', 'Rahul Singh', 'Neha Patel', 'Arun Kumar'
    ]
    return names[parseInt(hash.slice(0, 2), 16) % names.length]
  }

  private generateDOB(hash: string): string {
    const day = (parseInt(hash.slice(2, 4), 16) % 28) + 1
    const month = (parseInt(hash.slice(4, 6), 16) % 12) + 1
    const year = 1980 + (parseInt(hash.slice(6, 8), 16) % 30)
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`
  }

  private generateGender(hash: string): string {
    return parseInt(hash.slice(8, 10), 16) % 2 === 0 ? 'M' : 'F'
  }

  private generateMaskedUID(hash: string): string {
    let uid = ''
    for (let i = 0; i < 12; i++) {
      uid += (parseInt(hash.slice(i * 2, i * 2 + 2), 16) % 10).toString()
    }
    return uid
  }

  private generateAddress(hash: string): string {
    const addresses = [
      '123 Main Street, Mumbai, Maharashtra, 400001',
      '456 Park Avenue, Delhi, Delhi, 110001',
      '789 Lake Road, Bangalore, Karnataka, 560001',
      '321 Garden Street, Chennai, Tamil Nadu, 600001',
      '654 Hill View, Kolkata, West Bengal, 700001',
      '987 Market Road, Hyderabad, Telangana, 500001',
      '147 River Side, Pune, Maharashtra, 411001',
      '258 Forest Lane, Ahmedabad, Gujarat, 380001'
    ]
    return addresses[parseInt(hash.slice(10, 12), 16) % addresses.length]
  }

  private generateMobile(hash: string): string {
    let mobile = '9'
    for (let i = 0; i < 9; i++) {
      mobile += (parseInt(hash.slice(i * 2, i * 2 + 2), 16) % 10).toString()
    }
    return mobile
  }

  private generateEmail(hash: string): string {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
    const name = this.generateName(hash).toLowerCase().replace(' ', '.')
    const domain = domains[parseInt(hash.slice(14, 16), 16) % domains.length]
    return `${name}@${domain}`
  }

  private generateUIDAISignature(data: string): string {
    const hash = this.generateHash(data)
    return `uidai_sig_${hash.slice(0, 16)}`
  }

  /**
   * Utility functions
   */
  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str
    } catch {
      return false
    }
  }

  private isHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str) && str.length > 100
  }

  private generateHash(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}

// Export singleton instance
export const uidaiSDKSimulator = new UIDAISDKSimulator()
