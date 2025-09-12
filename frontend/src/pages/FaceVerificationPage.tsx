import React, { useState } from 'react'
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'
import UltraSimpleFaceVerification from '../components/UltraSimpleFaceVerification'
import { faceVerificationService, FaceVerificationData } from '../services/faceVerificationService'
import { backendService } from '../services/backendService'
import { storeAadhaarVerification } from '../utils/pinata'
import { CheckCircle, XCircle, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FaceVerificationPage() {
  const { user, userProfile } = useEnhancedAuth()
  const navigate = useNavigate()
  const [showVerification, setShowVerification] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean
    faceHash: string
    transactionId?: string
    verificationId: string
    error?: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleVerificationComplete = async (result: any) => {
    if (!user || !userProfile) {
      setVerificationResult({
        success: false,
        faceHash: result.faceHash,
        verificationId: '',
        error: 'User not authenticated'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare verification data
      const verificationData: FaceVerificationData = {
        faceHash: result.faceHash,
        landmarks: [], // Simple verification doesn't provide landmarks
        confidence: result.confidence,
        timestamp: Date.now(),
        userId: user.uid
      }

      // Validate data
      const validation = faceVerificationService.validateFaceData(verificationData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Store face data + hash in IPFS (not smart contract)
      const ipfsData = {
        type: 'face_verification',
        data: verificationData,
        hash: result.faceHash,
        timestamp: Date.now()
      }
      
      const ipfsHash = await storeAadhaarVerification(ipfsData)
      
      // Only tick verification checklist in smart contract (no data)
      const smartContractResult = await backendService.markVerificationComplete(
        'user', // targetUser
        1, // verificationType (face)
        1 // verifierId
      )

      setVerificationResult({
        success: smartContractResult.success,
        faceHash: result.faceHash,
        transactionId: smartContractResult.transactionId,
        verificationId: ipfsHash, // Use IPFS hash as verification ID
        error: smartContractResult.error
      })

    } catch (error: any) {
      console.error('Face verification submission error:', error)
      setVerificationResult({
        success: false,
        faceHash: result.faceHash,
        verificationId: '',
        error: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartVerification = () => {
    setShowVerification(true)
    setVerificationResult(null)
  }

  const handleCloseVerification = () => {
    setShowVerification(false)
  }

  const handleRetry = () => {
    setVerificationResult(null)
    setShowVerification(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access face verification</p>
          <button type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (showVerification) {
    return (
    <UltraSimpleFaceVerification
      onVerificationComplete={handleVerificationComplete}
      onClose={handleCloseVerification}
    />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Face Verification</h1>
        <p className="text-gray-600 mt-2">
          Use ultra-simple camera verification to verify your identity on the blockchain
        </p>
      </div>

      {verificationResult ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            {verificationResult.success ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-700 mb-2">Verification Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Your face has been successfully verified and recorded on the blockchain
                </p>
                
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-2">Verification Details:</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Face Hash:</strong> {verificationResult.faceHash.substring(0, 16)}...</p>
                    {verificationResult.transactionId && (
                      <p><strong>Transaction ID:</strong> {verificationResult.transactionId}</p>
                    )}
                    <p><strong>Verification ID:</strong> {verificationResult.verificationId}</p>
                    <p><strong>User:</strong> {userProfile?.displayName || user.email}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h2>
                <p className="text-gray-600 mb-4">
                  {verificationResult.error || 'Face verification could not be completed'}
                </p>
                
                <div className="bg-red-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
                  <p className="text-sm text-red-700">{verificationResult.error}</p>
                </div>
              </>
            )}
            
            <div className="flex justify-center gap-4">
              <button type="button"
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Face Detection</h3>
                  <p className="text-gray-600 text-sm">Ultra-simple camera verification technology</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Blink Detection</h3>
                  <p className="text-gray-600 text-sm">Anti-spoofing technology ensures you're a real person</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hash Generation</h3>
                  <p className="text-gray-600 text-sm">Unique facial features are converted to a secure hash using Web Crypto API</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Blockchain Storage</h3>
                  <p className="text-gray-600 text-sm">Your verification is recorded on the Algorand blockchain</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Good lighting on your face</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Remove glasses if possible</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Look directly at the camera</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Blink naturally when prompted</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700">Keep still during capture</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Privacy Notice</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your face image is never stored. Only a mathematical hash of your facial features is recorded on the blockchain for verification purposes.
                  </p>
                </div>
              </div>
            </div>

            <button type="button"
              onClick={handleStartVerification}
              disabled={isSubmitting}
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting Verification...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Start Face Verification
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
