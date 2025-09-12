import React, { useState, useRef, useCallback } from 'react'
import { ITRDataExtractionService, ExtractionResult } from '../../services/ITRDataExtractionService'

interface DocumentUploadProps {
  onFileProcessed: (result: ExtractionResult) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onError?: (error: string) => void
  acceptedTypes?: string[]
  maxFileSize?: number // in MB
  className?: string
}

interface UploadState {
  isDragOver: boolean
  isProcessing: boolean
  progress: number
  currentStep: string
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFileProcessed,
  onUploadStart,
  onUploadComplete,
  onError,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
  maxFileSize = 10, // 10MB default
  className = ''
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragOver: false,
    isProcessing: false,
    progress: 0,
    currentStep: ''
  })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extractionService = ITRDataExtractionService.getInstance()

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.includes(fileExtension)) {
        const error = `Unsupported file type. Please upload: ${acceptedTypes.join(', ')}`
        onError?.(error)
        return
      }

      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        const error = `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size ${maxFileSize}MB`
        onError?.(error)
        return
      }

      setUploadedFile(file)
      
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }

      // Start processing
      onUploadStart?.()
      setUploadState({
        isDragOver: false,
        isProcessing: true,
        progress: 10,
        currentStep: 'Reading file...'
      })

      // Process the file
      await processFile(file)

    } catch (error) {
      console.error('File selection error:', error)
      onError?.(error instanceof Error ? error.message : 'File selection failed')
      resetUploadState()
    }
  }, [acceptedTypes, maxFileSize, onError, onUploadStart])

  // Process uploaded file
  const processFile = async (file: File) => {
    try {
      // Update progress - file reading
      setUploadState(prev => ({
        ...prev,
        progress: 20,
        currentStep: file.type === 'application/pdf' ? 'Parsing PDF...' : 'Processing image with OCR...'
      }))

      // Simulate progress updates during processing
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 500)

      // Extract data using the extraction service
      const result = await extractionService.extractFromFile(file)

      // Clear progress interval
      clearInterval(progressInterval)

      // Final progress update
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        currentStep: 'Processing complete!'
      }))

      // Call the callback with results
      onFileProcessed(result)
      onUploadComplete?.()

      // Reset state after a brief delay
      setTimeout(() => {
        resetUploadState()
      }, 2000)

    } catch (error) {
      console.error('File processing error:', error)
      onError?.(error instanceof Error ? error.message : 'File processing failed')
      resetUploadState()
    }
  }

  // Reset upload state
  const resetUploadState = () => {
    setUploadState({
      isDragOver: false,
      isProcessing: false,
      progress: 0,
      currentStep: ''
    })
  }

  // Handle drag and drop events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState(prev => ({ ...prev, isDragOver: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadState(prev => ({ ...prev, isDragOver: false }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Remove uploaded file
  const removeFile = () => {
    setUploadedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    resetUploadState()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Area */}
      {!uploadedFile && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200 hover:border-blue-400 hover:bg-slate-800/30
            ${uploadState.isDragOver 
              ? 'border-blue-400 bg-blue-500/10' 
              : 'border-slate-600 bg-slate-800/20'
            }
            ${uploadState.isProcessing ? 'pointer-events-none' : ''}
          `}
        >
          <div className="space-y-4">
            {/* Upload Icon */}
            <div className="mx-auto w-16 h-16 text-slate-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Upload Text */}
            <div>
              <p className="text-lg font-medium text-white">
                {uploadState.isDragOver ? 'Drop your ITR document here' : 'Upload ITR Document'}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Drag and drop your ITR acknowledgment PDF or image, or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Supported formats: {acceptedTypes.join(', ')} • Max size: {maxFileSize}MB
              </p>
            </div>

            {/* Supported Features */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>PDF Text Extraction</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>OCR for Images</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Auto Field Detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Smart Validation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded File Display */}
      {uploadedFile && !uploadState.isProcessing && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-start space-x-4">
            {/* File Icon or Preview */}
            <div className="flex-shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Document preview"
                  className="w-16 h-16 object-cover rounded border border-slate-600"
                />
              ) : (
                <div className="w-16 h-16 bg-red-500/20 rounded flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* File Details */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {uploadedFile.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {formatFileSize(uploadedFile.size)} • {uploadedFile.type || 'Unknown type'}
              </p>
              <p className="text-xs text-green-400 mt-1">
                ✓ File uploaded successfully
              </p>
            </div>

            {/* Remove Button */}
            <button type="button"
              onClick={removeFile}
              className="flex-shrink-0 text-slate-400 hover:text-red-400 transition-colors"
              title="Remove file"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {uploadState.isProcessing && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600">
          <div className="space-y-4">
            {/* Processing Icon and Text */}
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-6 h-6 text-blue-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">
                  Processing Document
                </h4>
                <p className="text-xs text-slate-400">
                  {uploadState.currentStep}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>

            {/* Processing Steps */}
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>File upload completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  uploadState.progress >= 30 ? 'bg-green-400' : 'bg-slate-600'
                }`} />
                <span>Document analysis in progress</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  uploadState.progress >= 70 ? 'bg-green-400' : 'bg-slate-600'
                }`} />
                <span>Field extraction and validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  uploadState.progress >= 100 ? 'bg-green-400' : 'bg-slate-600'
                }`} />
                <span>Processing complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">
          📋 Document Upload Tips
        </h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Use high-quality scans or photos for better OCR accuracy</li>
          <li>• Ensure all text is clearly visible and not cut off</li>
          <li>• PDF documents typically provide more accurate extraction</li>
          <li>• The system can extract PAN, acknowledgment number, income, and other fields</li>
          <li>• You can manually correct any extracted data in the next step</li>
        </ul>
      </div>
    </div>
  )
}

export default DocumentUpload
