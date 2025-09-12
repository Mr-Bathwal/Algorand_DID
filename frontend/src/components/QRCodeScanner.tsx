import React, { useRef, useState, useCallback } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Camera, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface AadhaarData {
  name: string
  dob: string
  gender: string
  aadhaarNumber: string
  address: string
  pincode: string
  state: string
  district: string
  rawData: string
}

interface QRCodeScannerProps {
  onDataExtracted: (data: AadhaarData) => void
  onError: (error: string) => void
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onDataExtracted, onError }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<AadhaarData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse Aadhaar QR data
  const parseAadhaarData = useCallback((rawData: string): AadhaarData | null => {
    try {
      // Aadhaar QR contains XML data - parse it
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(rawData, 'text/xml')
      
      // Extract Aadhaar data from XML
      const name = xmlDoc.getElementsByTagName('name')[0]?.textContent || ''
      const dob = xmlDoc.getElementsByTagName('dob')[0]?.textContent || ''
      const gender = xmlDoc.getElementsByTagName('gender')[0]?.textContent || ''
      const aadhaarNumber = xmlDoc.getElementsByTagName('uid')[0]?.textContent || ''
      const address = xmlDoc.getElementsByTagName('address')[0]?.textContent || ''
      const pincode = xmlDoc.getElementsByTagName('pincode')[0]?.textContent || ''
      const state = xmlDoc.getElementsByTagName('state')[0]?.textContent || ''
      const district = xmlDoc.getElementsByTagName('district')[0]?.textContent || ''

      if (!name || !aadhaarNumber) {
        throw new Error('Invalid Aadhaar QR data')
      }

      return {
        name,
        dob,
        gender,
        aadhaarNumber,
        address,
        pincode,
        state,
        district,
        rawData
      }
    } catch (err) {
      console.error('Error parsing Aadhaar data:', err)
      return null
    }
  }, [])

  const handleScan = useCallback((result: any) => {
    if (result?.text) {
      const aadhaarData = parseAadhaarData(result.text)
      if (aadhaarData) {
        setScannedData(aadhaarData)
        setIsScanning(false)
        onDataExtracted(aadhaarData)
        setError(null)
      } else {
        setError('Invalid Aadhaar QR code')
        onError('Invalid Aadhaar QR code')
      }
    }
  }, [parseAadhaarData, onDataExtracted, onError])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string
          const aadhaarData = parseAadhaarData(result)
          if (aadhaarData) {
            setScannedData(aadhaarData)
            onDataExtracted(aadhaarData)
            setError(null)
          } else {
            setError('Invalid Aadhaar QR file')
            onError('Invalid Aadhaar QR file')
          }
        } catch (err) {
          setError('Error reading file')
          onError('Error reading file')
        }
      }
      reader.readAsText(file)
    }
  }, [parseAadhaarData, onDataExtracted, onError])

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Aadhaar QR Scanner</h2>
        <p className="text-gray-600">Scan or upload Aadhaar QR code to extract data</p>
      </div>

      {!isScanning && !scannedData && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsScanning(true)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Camera className="h-6 w-6" />
            Start Camera Scan
          </button>
          
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.txt,.qr"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FileText className="h-6 w-6" />
              Upload QR File
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
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {scannedData && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold text-green-800">Aadhaar Data Extracted Successfully</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <p className="text-gray-900">{scannedData.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Aadhaar Number:</span>
              <p className="text-gray-900">{scannedData.aadhaarNumber}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Date of Birth:</span>
              <p className="text-gray-900">{scannedData.dob}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Gender:</span>
              <p className="text-gray-900">{scannedData.gender}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Address:</span>
              <p className="text-gray-900">{scannedData.address}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Pincode:</span>
              <p className="text-gray-900">{scannedData.pincode}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">State:</span>
              <p className="text-gray-900">{scannedData.state}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodeScanner
