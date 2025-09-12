/**
 * ITR Verification Component
 * Handles Income Tax Return download and verification
 */

import React, { useState, useRef } from 'react'
import { itrService, ITRData } from '../services/itrService'
import { merkleTreeService } from '../services/merkleTreeService'
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'

interface ITRVerificationProps {
  onSuccess: (data: ITRData) => void
  onError: (error: string) => void
  onBack: () => void
}

export default function ITRVerification({ onSuccess, onError, onBack }: ITRVerificationProps) {
  const [panNumber, setPanNumber] = useState('')
  const [assessmentYear, setAssessmentYear] = useState('2024-25')
  const [itrData, setItrData] = useState<ITRData | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useEnhancedAuth()

  const handleDownloadITR = async () => {
    if (!panNumber.trim()) {
      setErrorMessage('Please enter PAN number')
      setVerificationStatus('error')
      return
    }

    if (!itrService.validatePAN(panNumber)) {
      setErrorMessage('Invalid PAN number format')
      setVerificationStatus('error')
      return
    }

    try {
      setIsDownloading(true)
      setVerificationStatus('idle')
      setErrorMessage('')

      console.log('📥 Downloading ITR...', { panNumber, assessmentYear })

      // Download ITR acknowledgment
      const data = await itrService.downloadITRAcknowledgment(panNumber, assessmentYear)
      
      if (!data) {
        throw new Error('Failed to download ITR acknowledgment')
      }

      setItrData(data)
      setVerificationStatus('idle')
    } catch (error: any) {
      console.error('❌ ITR download error:', error)
      setErrorMessage(error.message || 'Failed to download ITR')
      setVerificationStatus('error')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsDownloading(true)
      setVerificationStatus('idle')
      setErrorMessage('')

      console.log('📄 Processing ITR PDF...', file.name)

      // Process ITR PDF
      const data = await itrService.processITRPDF(file)
      
      if (!data) {
        throw new Error('Failed to process ITR PDF')
      }

      setItrData(data)
      setVerificationStatus('idle')
    } catch (error: any) {
      console.error('❌ ITR processing error:', error)
      setErrorMessage(error.message || 'Failed to process ITR PDF')
      setVerificationStatus('error')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleVerify = async () => {
    if (!itrData || !user) return

    try {
      setIsVerifying(true)
      setVerificationStatus('idle')
      setErrorMessage('')

      console.log('🔄 Verifying ITR data...')

      // Verify with smart contract
      const result = await itrService.verifyITR(itrData, user.uid)
      
      if (result.success) {
        console.log('✅ ITR verification successful')
        
        // Generate Merkle proof
        const merkleProof = await merkleTreeService.generateIndividualProof('itr', itrData)
        console.log('🌳 Merkle proof generated:', merkleProof)
        
        setVerificationStatus('success')
        onSuccess(itrData)
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

  const handleReset = () => {
    setItrData(null)
    setVerificationStatus('idle')
    setErrorMessage('')
  }

  const currentYear = new Date().getFullYear()
  const assessmentYears = Array.from({ length: 5 }, (_, i) => `${currentYear - i}-${(currentYear - i + 1).toString().slice(-2)}`)

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Income Tax Return Verification</h2>
        <p className="text-gray-600">
          Download your ITR acknowledgment or upload ITR PDF to verify your income
        </p>
      </div>

      {!itrData ? (
        <div className="space-y-6">
          {/* Download Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Download from Government Portal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Year
                </label>
                <select
                  value={assessmentYear}
                  onChange={(e) => setAssessmentYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {assessmentYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <button type="button"
                onClick={handleDownloadITR}
                disabled={isDownloading || !panNumber.trim()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDownloading ? 'Downloading...' : '📥 Download ITR'}
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Upload ITR PDF</h3>
            <div className="text-center">
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
              >
                📁 Upload ITR PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload your ITR acknowledgment PDF file
              </p>
            </div>
          </div>

          {/* Government Portal Links */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Government Portal Links</h3>
            <div className="space-y-2 text-sm">
              <a
                href="https://www.incometax.gov.in/iec/foportal"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800"
              >
                🔗 Income Tax e-Filing Portal
              </a>
              <a
                href="https://www.incometax.gov.in/iec/foportal/help"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800"
              >
                🔗 Help & Support
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ITR Data Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">ITR Data:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Name:</span> {itrData.name}</div>
              <div><span className="font-medium">PAN:</span> {itrData.panNumber}</div>
              <div><span className="font-medium">Assessment Year:</span> {itrData.assessmentYear}</div>
              <div><span className="font-medium">Total Income:</span> ₹{itrData.totalIncome.toLocaleString()}</div>
              <div><span className="font-medium">Taxable Income:</span> ₹{itrData.taxableIncome.toLocaleString()}</div>
              <div><span className="font-medium">Tax Paid:</span> ₹{itrData.taxPaid.toLocaleString()}</div>
              <div><span className="font-medium">Refund:</span> ₹{itrData.refundAmount.toLocaleString()}</div>
              <div><span className="font-medium">Filing Date:</span> {itrData.filingDate}</div>
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
              {isVerifying ? 'Verifying...' : 'Verify ITR'}
            </button>
            
            <button type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
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