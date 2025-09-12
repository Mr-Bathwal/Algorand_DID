import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

// Import new services and components
import { ITRDataExtractionService, ITRExtractedData, ExtractionResult } from '../services/ITRDataExtractionService'
import { ITRValidationService, CompleteValidationResult } from '../services/ITRValidationService'
import { GovernmentAPIService, GovernmentVerificationResponse, GovernmentVerificationRequest } from '../services/GovernmentAPIService'
import { ITRIPFSStorageService, IPFSStorageResult } from '../services/ITRIPFSStorageService'
import DocumentUpload from './itr/DocumentUpload'
import ITRFieldEditor from './itr/ITRFieldEditor'

interface EnhancedITRVerificationProps {
  onVerificationComplete: (success: boolean, data?: any) => void
  isActive: boolean
  className?: string
}

type VerificationStep = 
  | 'upload'           // Document upload and data extraction
  | 'edit'             // Field editing and validation
  | 'verify'           // Government API verification
  | 'ipfs'             // IPFS storage with hashing
  | 'success'          // Completion
  | 'failed'           // Error state

interface VerificationState {
  step: VerificationStep
  extractedData: Partial<ITRExtractedData>
  validation: CompleteValidationResult | null
  governmentResponse: GovernmentVerificationResponse | null
  ipfsResult: IPFSStorageResult | null
  isProcessing: boolean
  error: string | null
  warnings: string[]
  processingStep: string
  dataHash: string
  verificationSummary: any
}

const EnhancedITRVerification: React.FC<EnhancedITRVerificationProps> = ({
  onVerificationComplete,
  isActive,
  className = ''
}) => {
  const { address: userAddress } = useAccount()

  // Service instances
  const extractionService = ITRDataExtractionService.getInstance()
  const validationService = ITRValidationService.getInstance()
  const governmentService = GovernmentAPIService.getInstance()
  const ipfsService = ITRIPFSStorageService.getInstance()

  // State management
  const [state, setState] = useState<VerificationState>({
    step: 'upload',
    extractedData: {},
    validation: null,
    governmentResponse: null,
    ipfsResult: null,
    isProcessing: false,
    error: null,
    warnings: [],
    processingStep: '',
    dataHash: '',
    verificationSummary: null
  })

  // Reset verification state
  const resetVerification = () => {
    setState({
      step: 'upload',
      extractedData: {},
      validation: null,
      governmentResponse: null,
      ipfsResult: null,
      isProcessing: false,
      error: null,
      warnings: [],
      processingStep: '',
      dataHash: '',
      verificationSummary: null
    })
  }

  // Handle document upload and extraction
  const handleDocumentProcessed = async (result: ExtractionResult) => {
    try {
      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.errors.join(', '),
          warnings: result.warnings,
          step: 'upload'
        }))
        return
      }

      // Move to editing step with extracted data
      setState(prev => ({
        ...prev,
        extractedData: result.data,
        warnings: result.warnings,
        step: 'edit',
        error: null
      }))

      console.log('Document extraction completed:', result)

    } catch (error) {
      console.error('Document processing failed:', error)
      setState(prev => ({
        ...prev,
        error: `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        step: 'upload'
      }))
    }
  }

  // Handle field data changes
  const handleDataChange = (data: Partial<ITRExtractedData>) => {
    setState(prev => ({
      ...prev,
      extractedData: data,
      error: null
    }))
  }

  // Handle validation changes
  const handleValidationChange = (validation: CompleteValidationResult) => {
    setState(prev => ({
      ...prev,
      validation
    }))
  }

  // Proceed to government verification
  const handleProceedToVerification = async () => {
    if (!state.validation?.isCompletelyValid) {
      setState(prev => ({
        ...prev,
        error: 'Please fix all validation errors before proceeding'
      }))
      return
    }

    if (!userAddress) {
      setState(prev => ({
        ...prev,
        error: 'Please connect your wallet to proceed'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      step: 'verify',
      isProcessing: true,
      processingStep: 'Preparing verification request...',
      error: null
    }))

    try {
      // Prepare government verification request
      const request: GovernmentVerificationRequest = {
        ackNumber: state.extractedData.ackNumber!,
        pan: state.extractedData.pan!,
        assessmentYear: state.extractedData.assessmentYear!,
        applicantName: state.extractedData.applicantName
      }

      setState(prev => ({
        ...prev,
        processingStep: 'Verifying with Income Tax Department...'
      }))

      // Call government API
      const response = await governmentService.verifyITR(request)

      setState(prev => ({
        ...prev,
        governmentResponse: response,
        isProcessing: false
      }))

      if (response.verified) {
        // Proceed to IPFS storage automatically for verified documents
        await handleProceedToIPFS(response)
      } else {
        setState(prev => ({
          ...prev,
          error: response.errors.join(', ') || 'Government verification failed',
          warnings: response.warnings,
          step: 'failed'
        }))
      }

    } catch (error) {
      console.error('Government verification failed:', error)
      setState(prev => ({
        ...prev,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isProcessing: false,
        step: 'failed'
      }))
    }
  }

  // Handle IPFS storage
  const handleProceedToIPFS = async (governmentResponse: GovernmentVerificationResponse) => {
    if (!userAddress) {
      setState(prev => ({
        ...prev,
        error: 'Wallet not connected'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      step: 'ipfs',
      isProcessing: true,
      processingStep: 'Preparing secure storage...'
    }))

    try {
      setState(prev => ({
        ...prev,
        processingStep: 'Generating cryptographic hashes...'
      }))

      // Store verified data on IPFS with encryption
      const ipfsResult = await ipfsService.storeVerifiedITRData(
        userAddress,
        state.extractedData as ITRExtractedData,
        governmentResponse
      )

      setState(prev => ({
        ...prev,
        ipfsResult,
        processingStep: 'Creating verification summary...'
      }))

      // Generate final verification hash
      const finalHash = ipfsService.generateQuickHash(
        state.extractedData.ackNumber!,
        state.extractedData.pan!,
        state.extractedData.annualCertifiedIncome!,
        state.extractedData.assessmentYear!
      )

      // Create verification summary
      const verificationSummary = {
        userAddress,
        extractedData: state.extractedData,
        governmentResponse,
        ipfsResult,
        dataHash: finalHash,
        timestamp: Date.now(),
        verificationSource: governmentResponse.data?.verificationSource,
        privacyLevel: ipfsResult.privacyLevel,
        storageConfiguration: ipfsService.getConfiguration()
      }

      setState(prev => ({
        ...prev,
        dataHash: finalHash,
        verificationSummary,
        isProcessing: false,
        step: 'success'
      }))

      // Call completion callback
      onVerificationComplete(true, verificationSummary)

    } catch (error) {
      console.error('IPFS storage failed:', error)
      setState(prev => ({
        ...prev,
        error: `Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isProcessing: false,
        step: 'failed'
      }))
    }
  }

  // Get step progress
  const getStepProgress = (): number => {
    switch (state.step) {
      case 'upload': return 0
      case 'edit': return 25
      case 'verify': return 50
      case 'ipfs': return 75
      case 'success': return 100
      case 'failed': return 0
      default: return 0
    }
  }

  // Get current step title
  const getStepTitle = (): string => {
    switch (state.step) {
      case 'upload': return 'Document Upload & Data Extraction'
      case 'edit': return 'Field Review & Validation'
      case 'verify': return 'Government Verification'
      case 'ipfs': return 'Secure Storage & Hashing'
      case 'success': return 'Verification Complete'
      case 'failed': return 'Verification Failed'
      default: return 'ITR Verification'
    }
  }

  if (!isActive) return null

  return (
    <div className={`space-y-6 p-6 bg-slate-800/50 rounded-lg border border-slate-600 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">
          📋 Enhanced ITR Verification System
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          Advanced document processing with OCR, government verification, and secure IPFS storage
        </p>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
        <div className="text-xs text-slate-400">
          Step {Math.max(1, Math.floor(getStepProgress() / 25) + 1)} of 4: {getStepTitle()}
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-sm font-medium text-red-300">Verification Error</div>
              <div className="text-sm text-red-200">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings Display */}
      {state.warnings.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-sm font-medium text-yellow-300">Warnings</div>
              <ul className="text-sm text-yellow-200 mt-1 space-y-1">
                {state.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Document Upload */}
      {state.step === 'upload' && (
        <div className="space-y-4">
          <DocumentUpload
            onFileProcessed={handleDocumentProcessed}
            onError={(error) => setState(prev => ({ ...prev, error }))}
            acceptedTypes={extractionService.getSupportedFileTypes()}
            maxFileSize={10}
          />
        </div>
      )}

      {/* Step 2: Field Editing */}
      {state.step === 'edit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">
              Review & Edit Extracted Data
            </h4>
            <button type="button"
              onClick={() => setState(prev => ({ ...prev, step: 'upload' }))}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Upload
            </button>
          </div>

          <ITRFieldEditor
            initialData={state.extractedData}
            onDataChange={handleDataChange}
            onValidationChange={handleValidationChange}
            showOptionalFields={true}
            highlightErrors={true}
          />

          <div className="flex justify-end space-x-3">
            <button type="button"
              onClick={() => setState(prev => ({ ...prev, step: 'upload' }))}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Back
            </button>
            <button type="button"
              onClick={handleProceedToVerification}
              disabled={!state.validation?.isCompletelyValid || !userAddress}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                state.validation?.isCompletelyValid && userAddress
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 cursor-not-allowed text-gray-400'
              }`}
            >
              {!userAddress ? 'Connect Wallet' : 'Verify with Government'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Government Verification */}
      {state.step === 'verify' && (
        <div className="space-y-4">
          {state.isProcessing ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto text-blue-400 animate-spin">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div className="text-lg font-semibold text-white">
                Government Verification in Progress
              </div>
              <div className="text-sm text-slate-300">
                {state.processingStep}
              </div>
              <div className="text-xs text-slate-400">
                This may take a few moments while we verify your ITR with the official portal
              </div>
            </div>
          ) : state.governmentResponse?.verified ? (
            <div className="text-center space-y-4">
              <div className="text-4xl text-green-400 mb-2">✅</div>
              <div className="text-xl font-semibold text-green-400">
                Government Verification Successful!
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-left">
                <h5 className="text-sm font-medium text-green-300 mb-2">Verified Details:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Source:</span>
                    <span className="text-green-300">{state.governmentResponse.data?.verificationSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Status:</span>
                    <span className="text-green-300">{state.governmentResponse.data?.filingStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">ITR Form:</span>
                    <span className="text-white">{state.governmentResponse.data?.itrForm}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 4: IPFS Storage */}
      {state.step === 'ipfs' && (
        <div className="space-y-4">
          {state.isProcessing ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto text-purple-400 animate-pulse">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-lg font-semibold text-white">
                Secure Storage Processing
              </div>
              <div className="text-sm text-slate-300">
                {state.processingStep}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 5: Success */}
      {state.step === 'success' && state.verificationSummary && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl text-green-400 mb-4">🎉</div>
            <div className="text-2xl font-bold text-green-400 mb-2">
              ITR Verification Complete!
            </div>
            <div className="text-slate-300">
              Your ITR has been successfully verified and stored securely
            </div>
          </div>

          {/* Verification Summary */}
          <div className="bg-slate-700/50 rounded-lg p-6 space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">
              Verification Summary
            </h4>

            {/* Core Data Hash */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-300 mb-2">
                🔐 Blockchain-Ready Hash (SHA-256)
              </div>
              <div className="text-xs font-mono text-slate-300 break-all bg-slate-800 p-2 rounded">
                {state.dataHash}
              </div>
              <div className="text-xs text-purple-200 mt-2">
                This hash represents your verified income data and can be stored on blockchain
              </div>
            </div>

            {/* IPFS Storage */}
            {state.ipfsResult?.cid && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-300 mb-2">
                  🌐 IPFS Storage
                </div>
                <div className="text-xs">
                  <div className="mb-1">
                    <span className="text-slate-400">CID:</span>
                    <span className="text-blue-200 ml-2 font-mono">{state.ipfsResult.cid}</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-slate-400">Privacy Level:</span>
                    <span className="text-blue-200 ml-2">{state.ipfsResult.privacyLevel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Storage Size:</span>
                    <span className="text-blue-200 ml-2">{Math.round(state.ipfsResult.storageSize / 1024)} KB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Details */}
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="text-slate-400 font-medium">Verified Data:</div>
                <div className="space-y-1">
                  <div>PAN: <span className="text-white">{state.extractedData.pan}</span></div>
                  <div>Assessment Year: <span className="text-white">{state.extractedData.assessmentYear}</span></div>
                  <div>Annual Income: <span className="text-green-300">₹{state.extractedData.annualCertifiedIncome}</span></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-slate-400 font-medium">Verification:</div>
                <div className="space-y-1">
                  <div>Source: <span className="text-white">{state.governmentResponse?.data?.verificationSource}</span></div>
                  <div>Status: <span className="text-green-300">Verified ✓</span></div>
                  <div>Timestamp: <span className="text-white">{new Date(state.verificationSummary.timestamp).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button type="button"
              onClick={resetVerification}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Verify Another ITR
            </button>
            <button type="button"
              onClick={() => {
                if (state.ipfsResult?.url) {
                  window.open(state.ipfsResult.url, '_blank')
                }
              }}
              disabled={!state.ipfsResult?.url}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              View on IPFS
            </button>
            <button type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.dataHash)
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Copy Hash
            </button>
          </div>
        </div>
      )}

      {/* Failed State */}
      {state.step === 'failed' && (
        <div className="space-y-4 text-center">
          <div className="text-4xl text-red-400 mb-2">❌</div>
          <div className="text-xl font-semibold text-red-400">Verification Failed</div>
          
          {state.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {state.error}
            </div>
          )}

          <div className="flex justify-center space-x-3">
            <button type="button"
              onClick={resetVerification}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              🔄 Start Over
            </button>
            <button type="button"
              onClick={() => setState(prev => ({ ...prev, step: 'edit' }))}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
            >
              📝 Edit Data
            </button>
          </div>
        </div>
      )}

      {/* Footer Information */}
      <div className="text-xs text-slate-400 text-center space-y-1 pt-4 border-t border-slate-600">
        <div>🔐 End-to-end security: Documents → OCR/PDF parsing → Government verification → SHA-256 hashing → IPFS storage</div>
        <div>🌐 Decentralized storage ensures your data remains accessible and tamper-proof</div>
        <div>🔒 Privacy-preserving: Only verification hashes are stored on blockchain, sensitive data stays encrypted</div>
        {!userAddress && <div className="text-yellow-400">⚠️ Connect your wallet to complete the verification process</div>}
      </div>
    </div>
  )
}

export default EnhancedITRVerification
