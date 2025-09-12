import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { headPoseEstimator, type HeadPoseChallenge, type HeadPoseResult } from '../utils/headPoseEstimation'

interface HeadPoseVerificationProps {
  onVerificationComplete: (success: boolean, data?: HeadPoseResult) => void
  isActive: boolean
}

const HeadPoseVerification: React.FC<HeadPoseVerificationProps> = ({ 
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
  const [challenge, setChallenge] = useState<HeadPoseChallenge | null>(null)
  const [currentInstruction, setCurrentInstruction] = useState<string>('')
  const [instructionIndex, setInstructionIndex] = useState(0)
  const [verificationResult, setVerificationResult] = useState<'waiting' | 'success' | 'failed'>('waiting')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize the head pose verification system
  useEffect(() => {
    if (isActive && !isInitialized) {
      initializeHeadPose()
    }
  }, [isActive, isInitialized])

  const initializeHeadPose = async () => {
    try {
      console.log('🔄 Initializing head pose verification...')
      const success = await headPoseEstimator.initialize()
      if (success) {
        setIsInitialized(true)
        generateChallenge()
        console.log('✅ Head pose verification ready')
      } else {
        setError('Failed to initialize head pose verification system')
      }
    } catch (error) {
      console.error('❌ Initialization error:', error)
      setError('Failed to initialize head pose verification system')
    }
  }

  const generateChallenge = () => {
    const newChallenge = headPoseEstimator.generateChallenge()
    setChallenge(newChallenge)
    setCurrentInstruction(newChallenge.instructions[0])
    setInstructionIndex(0)
    console.log('🎯 Head pose challenge generated:', newChallenge.instructions)
  }

  const startRecording = async () => {
    try {
      setError('')
      setVerificationResult('waiting')
      
      // Get camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user'
        }
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
      setError('Camera access denied. Please allow camera access.')
    }
  }

  const startActualRecording = () => {
    if (!streamRef.current || !challenge) return

    try {
      // Create MediaRecorder for video
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8'
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

      // Update instructions and progress
      const instructionInterval = challenge.duration / challenge.instructions.length
      let currentIndex = 0
      
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            stopRecording()
            return 100
          }
          return prev + 1
        })
      }, challenge.duration / 100)

      // Update instructions
      const instructionTimer = setInterval(() => {
        currentIndex++
        if (currentIndex < challenge.instructions.length) {
          setCurrentInstruction(challenge.instructions[currentIndex])
          setInstructionIndex(currentIndex)
        } else {
          clearInterval(instructionTimer)
        }
      }, instructionInterval)

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
    if (!challenge) {
      setError('Missing challenge data')
      return
    }

    setIsProcessing(true)
    setVerificationResult('waiting')

    try {
      console.log('🔄 Processing head pose verification...')
      
      const result = await headPoseEstimator.detectHeadMovements(videoBlob)

      console.log('📊 Head pose verification result:', result)
      
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
    setInstructionIndex(0)
    generateChallenge()
  }

  if (!isInitialized) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="glass p-8 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white/70">Initializing head pose verification...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Head Pose Verification</h2>
          <p className="text-white/70">Follow the instructions to move your head - verifies 3D liveliness</p>
        </div>

        {challenge && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Instructions</h3>
            <div className="space-y-2">
              {challenge.instructions.map((instruction, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    index === instructionIndex && isRecording 
                      ? 'text-yellow-300 font-semibold' 
                      : index < instructionIndex 
                        ? 'text-green-300' 
                        : 'text-blue-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    index === instructionIndex && isRecording
                      ? 'bg-yellow-500 text-black'
                      : index < instructionIndex
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                  }`}>
                    {index < instructionIndex ? '✓' : index + 1}
                  </div>
                  {instruction}
                </div>
              ))}
            </div>
            <p className="text-blue-100 text-sm mt-3">
              Duration: {challenge.duration / 1000} seconds • Required: {challenge.requiredMovements} movements
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

            {isRecording && currentInstruction && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/70 text-white p-3 rounded-lg text-center">
                  <p className="text-lg font-semibold">{currentInstruction}</p>
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
                Head Pose Verification Successful!
              </div>
            </div>
          )}

          {verificationResult === 'failed' && (
            <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 text-red-300">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Head Pose Verification Failed
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
                Start Head Pose Verification
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
            <p>• Follow the on-screen instructions to move your head</p>
            <p>• Turn LEFT, RIGHT, look UP and DOWN</p>
            <p>• This verifies 3D liveliness (hard to spoof)</p>
            <p>• Ensure good lighting for face detection</p>
            <p className="text-green-300">• Much more reliable than lip-sync!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeadPoseVerification
