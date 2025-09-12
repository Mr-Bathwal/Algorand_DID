import React, { useState, useRef } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Scan, FileText, Shield, Eye, EyeOff, Download } from 'lucide-react'

interface ZKPData {
  proof: string
  publicInputs: string[]
  verificationKey: string
  timestamp: number
  dataHash: string
}

interface ZKPScannerProps {
  onDataExposed: (data: ZKPData) => void
  onError: (error: string) => void
}

const ZKPScanner: React.FC<ZKPScannerProps> = ({ onDataExposed, onError }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [exposedData, setExposedData] = useState<ZKPData | null>(null)
  const [isDataVisible, setIsDataVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse ZKP data from QR
  const parseZKPData = (rawData: string): ZKPData | null => {
    try {
      const data = JSON.parse(rawData)
      
      // Validate ZKP data structure
      if (!data.proof || !data.publicInputs || !data.verificationKey) {
        throw new Error('Invalid ZKP data structure')
      }

      return {
        proof: data.proof,
        publicInputs: data.publicInputs,
        verificationKey: data.verificationKey,
        timestamp: data.timestamp || Date.now(),
        dataHash: data.dataHash || ''
      }
    } catch (err) {
      console.error('Error parsing ZKP data:', err)
      return null
    }
  }

  const handleScan = (result: any) => {
    if (result?.text) {
      const zkpData = parseZKPData(result.text)
      if (zkpData) {
        setExposedData(zkpData)
        setIsScanning(false)
        onDataExposed(zkpData)
        setError(null)
      } else {
        setError('Invalid ZKP proof data')
        onError('Invalid ZKP proof data')
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string
          const zkpData = parseZKPData(result)
          if (zkpData) {
            setExposedData(zkpData)
            onDataExposed(zkpData)
            setError(null)
          } else {
            setError('Invalid ZKP proof file')
            onError('Invalid ZKP proof file')
          }
        } catch (err) {
          setError('Error reading file')
          onError('Error reading file')
        }
      }
      reader.readAsText(file)
    }
  }

  const downloadData = () => {
    if (exposedData) {
      const dataStr = JSON.stringify(exposedData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `zkp-proof-${exposedData.timestamp}.json`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Zero-Knowledge Proof Scanner
        </h2>
        <p className="text-gray-600">Scan or upload ZKP data to expose verification details</p>
      </div>

      {!isScanning && !exposedData && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsScanning(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Scan className="h-6 w-6" />
            Start ZKP Scan
          </button>
          
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FileText className="h-6 w-6" />
              Upload ZKP File
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="space-y-4">
          <div className="relative">
            <Scanner
              onScan={handleScan}
              onError={(error) => console.error('QR Scan error:', error)}
              style={{ width: '100%', height: '300px' }}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsScanning(false)}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Stop Scanning
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <Shield className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {exposedData && (
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">ZKP Data Exposed Successfully</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDataVisible(!isDataVisible)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                {isDataVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isDataVisible ? 'Hide' : 'Show'} Data
              </button>
              <button
                type="button"
                onClick={downloadData}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>

          {/* ZKP Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Proof Information</h4>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Timestamp:</span>
                  <p className="text-gray-900 text-sm">
                    {new Date(exposedData.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Data Hash:</span>
                  <p className="text-gray-900 text-sm font-mono break-all">
                    {exposedData.dataHash || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Public Inputs Count:</span>
                  <p className="text-gray-900 text-sm">
                    {exposedData.publicInputs.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Key */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Verification Key</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-mono text-gray-600 break-all">
                  {exposedData.verificationKey.substring(0, 100)}...
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Data (Toggleable) */}
          {isDataVisible && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Detailed ZKP Data</h4>
              
              {/* Public Inputs */}
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Public Inputs:</h5>
                <div className="space-y-2">
                  {exposedData.publicInputs.map((input, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm font-mono">
                      {input}
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof */}
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Proof:</h5>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-mono text-gray-600 break-all">
                    {exposedData.proof}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <h5 className="font-semibold text-green-800">Verification Status</h5>
                <p className="text-green-700 text-sm">
                  ZKP data has been successfully exposed and is ready for verification
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ZKPScanner
