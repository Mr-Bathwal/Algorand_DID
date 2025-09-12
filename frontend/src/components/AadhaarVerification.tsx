/**
 * Aadhaar Verification Component
 * Handles Aadhaar QR code scanning and verification
 */

import React, { useState, useRef } from 'react'
// import { QrScanner } from '@yudiel/react-qr-scanner' // Temporarily disabled to fix CSP issues
import { aadhaarService, AadhaarData } from '../services/aadhaarService'
import { merkleTreeService } from '../services/merkleTreeService'
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'

interface AadhaarVerificationProps {
  onSuccess: (data: AadhaarData) => void
  onError: (error: string) => void
  onBack: () => void
}

export default function AadhaarVerification({ onSuccess, onError, onBack }: AadhaarVerificationProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<AadhaarData | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useEnhancedAuth()

  const handleQRScan = async (result: string) => {
    try {
      console.log('📱 QR Code scanned:', result)
      setIsScanning(false)
      
      // Decode Aadhaar QR data
      const aadhaarData = await aadhaarService.decodeAadhaarQR(result)
      
      if (!aadhaarData) {
        throw new Error('Failed to decode Aadhaar QR code')
      }

      setScannedData(aadhaarData)
      setVerificationStatus('idle')
      setErrorMessage('')
    } catch (error: any) {
      console.error('QR scan error:', error)
      setErrorMessage(error.message || 'Failed to scan QR code')
      setVerificationStatus('error')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      console.log('📁 Processing uploaded file:', file.name)
      
      // For now, we'll simulate QR data from file
      // In production, this would extract QR code from image
      const mockQRData = 'simulated_qr_data_from_file'
      const aadhaarData = await aadhaarService.decodeAadhaarQR(mockQRData)
      
      if (!aadhaarData) {
        throw new Error('Failed to process uploaded file')
      }

      setScannedData(aadhaarData)
      setVerificationStatus('idle')
      setErrorMessage('')
    } catch (error: any) {
      console.error('File upload error:', error)
      setErrorMessage(error.message || 'Failed to process uploaded file')
      setVerificationStatus('error')
    }
  }

  const handleVerify = async () => {
    if (!scannedData || !user) return

    try {
      setIsVerifying(true)
      setVerificationStatus('idle')
      setErrorMessage('')

      console.log('🔄 Verifying Aadhaar data...')

      // Verify with smart contract
      const result = await aadhaarService.verifyAadhaar(scannedData, user.uid)
      
      if (result.success) {
        console.log('✅ Aadhaar verification successful')
        
        // Generate Merkle proof
        const merkleProof = await merkleTreeService.generateIndividualProof('aadhaar', scannedData)
        console.log('🌳 Merkle proof generated:', merkleProof)
        
        setVerificationStatus('success')
        onSuccess(scannedData)
      } else {
        throw new Error(result.error || 'Verification failed')
      }
    } catch (error: any) {
      console.error('❌ Verification error:', error)
      setErrorMessage(error.message || 'Verification failed')
      setVerificationStatus('error')
      onError(error.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRescan = () => {
    setScannedData(null)
    setVerificationStatus('idle')
    setErrorMessage('')
    setIsScanning(true)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aadhaar Verification</h2>
        <p className="text-gray-600">
          Scan your Aadhaar QR code or upload an image to verify your identity
        </p>
      </div>

      {!scannedData ? (
        <div className="space-y-4">
          {/* QR Scanner - Temporarily disabled for CSP compatibility */}
          {isScanning ? (
            <div className="relative bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                QR Scanner temporarily disabled for CSP compatibility
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Please use file upload instead
              </div>
              <button type="button"
                onClick={() => setIsScanning(false)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <button type="button"
                onClick={() => setIsScanning(true)}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                📱 Scan QR Code
              </button>
              
              <div className="text-gray-500">or</div>
              
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
              >
                📁 Upload Image
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scanned Data Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Scanned Aadhaar Data:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Name:</span> {scannedData.name}</div>
              <div><span className="font-medium">Aadhaar:</span> {scannedData.uid}</div>
              <div><span className="font-medium">Gender:</span> {scannedData.gender}</div>
              <div><span className="font-medium">DOB:</span> {scannedData.yearOfBirth}</div>
              <div><span className="font-medium">Address:</span> {scannedData.address}</div>
              <div><span className="font-medium">Pincode:</span> {scannedData.pincode}</div>
            </div>
          </div>

          {/* Verification Status */}
          {verificationStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-green-500 mr-2">✅</div>
                <span className="text-green-800 font-medium">Verification Successful!</span>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">❌</div>
                <span className="text-red-800 font-medium">Verification Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify Aadhaar'}
            </button>
            
            <button type="button"
              onClick={handleRescan}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Rescan
            </button>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button type="button"
          onClick={onBack}
          className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
