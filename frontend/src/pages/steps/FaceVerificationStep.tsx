import React, { useState } from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import UltraSimpleFaceVerification from '../../components/UltraSimpleFaceVerification'
import { faceVerificationService, FaceVerificationData } from '../../services/faceVerificationService'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

interface FaceVerificationStepProps {
  onNext: () => void
  onBack: () => void
}

export default function FaceVerificationStep({ onNext, onBack }: FaceVerificationStepProps) {
  const { user, userProfile } = useEnhancedAuth()
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

      // Submit to smart contract
      const smartContractResult = await faceVerificationService.submitFaceVerification(verificationData)

      setVerificationResult({
        success: smartContractResult.success,
        faceHash: result.faceHash,
        transactionId: smartContractResult.transactionId,
        verificationId: smartContractResult.verificationId,
        error: smartContractResult.error
      })

      if (smartContractResult.success) {
        // Auto-advance to next step after successful verification
        setTimeout(() => {
          onNext()
        }, 2000)
      }

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

  if (showVerification) {
    return (
      <UltraSimpleFaceVerification
        onVerificationComplete={handleVerificationComplete}
        onClose={handleCloseVerification}
      />
    )
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please sign in to access face verification</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Face Verification</h2>
      
      {verificationResult ? (
        <div className="text-center">
          {verificationResult.success ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700 mb-2">Verification Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your face has been successfully verified and recorded on the blockchain
              </p>
              
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-800 mb-2">Verification Details:</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Face Hash:</strong> {verificationResult.faceHash.substring(0, 16)}...</p>
                  {verificationResult.transactionId && (
                    <p><strong>Transaction ID:</strong> {verificationResult.transactionId}</p>
                  )}
                  <p><strong>User:</strong> {userProfile?.displayName || user.email}</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">Proceeding to next step...</p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-700 mb-2">Verification Failed</h3>
              <p className="text-gray-600 mb-4">
                {verificationResult.error || 'Face verification could not be completed'}
              </p>
              
              <div className="bg-red-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-red-800 mb-2">Error Details:</h4>
                <p className="text-sm text-red-700">{verificationResult.error}</p>
              </div>

              <div className="flex justify-center gap-4">
                <button type="button"
                  onClick={handleRetry}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button type="button"
                  onClick={onBack}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            Use ultra-simple camera verification to verify your identity on the blockchain
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Instructions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Face Detection</h4>
                    <p className="text-gray-600 text-sm">Ultra-simple camera verification technology</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Hash Generation</h4>
                    <p className="text-gray-600 text-sm">Unique facial features converted to secure hash</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Blockchain Storage</h4>
                    <p className="text-gray-600 text-sm">Verification recorded on Algorand blockchain</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700 text-sm">Good lighting on your face</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700 text-sm">Look directly at the camera</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700 text-sm">Keep still during capture</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 text-sm">Privacy Notice</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your face image is never stored. Only a mathematical hash is recorded on the blockchain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button type="button"
              onClick={onBack}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button type="button"
              onClick={handleStartVerification}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Start Verification
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
