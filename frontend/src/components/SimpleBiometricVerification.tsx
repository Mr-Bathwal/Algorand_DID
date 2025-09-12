import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { simpleBiometricVerifier, type ChallengeData, type SimpleBiometricResult } from '../utils/simpleBiometric'

interface SimpleBiometricVerificationProps {
  onVerificationComplete: (success: boolean, data?: SimpleBiometricResult) => void
  isActive: boolean
}

const SimpleBiometricVerification: React.FC<SimpleBiometricVerificationProps> = ({ 
  onVerificationComplete, 
  isActive 
}) => {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState<number>(0)
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null)
  const [verificationResult, setVerificationResult] = useState<'waiting' | 'success' | 'failed'>('waiting')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize the biometric system
  useEffect(() => {
    if (isActive && !isInitialized) {
      initializeBiometric()
    }
  }, [isActive, isInitialized])

  const initializeBiometric = async () => {
    try {
      console.log('🔄 Initializing simple biometric system...')
      const success = await simpleBiometricVerifier.initialize()
      if (success) {
        setIsInitialized(true)
        generateChallenge()
        console.log('✅ Simple biometric system ready')
      } else {
        setError('Failed to initialize biometric system')
      }
    } catch (error) {
      console.error('❌ Initialization error:', error)
      setError('Failed to initialize biometric system')
    }
  }

  const generateChallenge = () => {
    const challenge = simpleBiometricVerifier.generateChallenge()
    setChallengeData(challenge)
    console.log('🎯 Challenge generated:', challenge.phrase)
  }

  const startRecording = async () => {
    try {
      setError('')
      setVerificationResult('waiting')
      
      // Get camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user'
        },
        audio: true
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Start countdown
      setCountdown(3)
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            startActualRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      console.error('❌ Camera access error:', error)
      setError('Camera access denied. Please allow camera and microphone access.')
    }
  }

  const startActualRecording = () => {
    if (!streamRef.current) return

    try {
      // Create MediaRecorder for video + audio
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' })
        await processRecording(videoBlob)
      }

      // Start recording
      mediaRecorder.start(100) // Record in 100ms chunks
      setIsRecording(true)
      setProgress(0)

      // Update progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            stopRecording()
            return 100
          }
          return prev + 2
        })
      }, challengeData?.duration ? challengeData.duration / 50 : 200)

    } catch (error) {
      console.error('❌ Recording error:', error)
      setError('Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const processRecording = async (videoBlob: Blob) => {
    if (!challengeData) {
      setError('Missing challenge data')
      return
    }

    setIsProcessing(true)
    setVerificationResult('waiting')

    try {
      console.log('🔄 Processing simple biometric verification...')
      
      const result = await simpleBiometricVerifier.verifyBiometric(
        videoBlob,
        challengeData
      )

      console.log('📊 Verification result:', result)
      
      setVerificationResult(result.success ? 'success' : 'failed')
      onVerificationComplete(result.success, result)

    } catch (error) {
      console.error('❌ Processing error:', error)
      setError('Failed to process verification')
      setVerificationResult('failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const retryVerification = () => {
    setError('')
    setVerificationResult('waiting')
    setProgress(0)
    generateChallenge()
  }

  if (!isInitialized) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="glass p-8 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white/70">Initializing biometric system...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass p-8 rounded-xl border border-white/10">
        <div className="text-center mb-6">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Simple Biometric Verification</h2>
          <p className="text-white/70">Face detection + lip-sync verification (Fallback Mode)</p>
        </div>

        {challengeData && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Challenge Phrase</h3>
            <p className="text-blue-200 text-lg font-medium">{challengeData.phrase}</p>
            <p className="text-blue-100 text-sm mt-2">
              Duration: {challengeData.duration / 1000} seconds
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-black rounded-lg object-cover"
              muted
              playsInline
            />
            
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-6xl font-bold text-white">{countdown}</div>
              </div>
            )}
            
            {isRecording && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Recording
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isRecording && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-brand-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {/* Status Messages */}
          {verificationResult === 'success' && (
            <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 text-green-300">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verification Successful!
              </div>
            </div>
          )}

          {verificationResult === 'failed' && (
            <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 text-red-300">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Verification Failed
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isRecording && verificationResult === 'waiting' && (
              <button type="button"
                onClick={startRecording}
                className="flex-1 py-3 px-6 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors"
              >
                Start Recording
              </button>
            )}

            {isRecording && (
              <button type="button"
                onClick={stopRecording}
                className="flex-1 py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
              >
                Stop Recording
              </button>
            )}

            {verificationResult === 'failed' && (
              <button type="button"
                onClick={retryVerification}
                className="flex-1 py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Try Again
              </button>
            )}

            {isProcessing && (
              <div className="flex-1 py-3 px-6 rounded-lg bg-gray-600 text-white font-semibold flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-white/70 space-y-1">
            <p>• Keep your face centered in the camera</p>
            <p>• Speak the challenge phrase clearly</p>
            <p>• Ensure good lighting and audio quality</p>
            <p>• Look directly at the camera while speaking</p>
            <p className="text-yellow-300">• Using fallback mode (no AI models required)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleBiometricVerification
