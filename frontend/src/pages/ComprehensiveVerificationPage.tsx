import React, { useState, useEffect } from 'react'
import { useAlgorand } from '../algorand/AlgorandProvider'
import { backendService } from '../services/backendService'
import { storeAadhaarVerification } from '../utils/pinata'
import QRCodeScanner from '../components/QRCodeScanner'
import MerkleTreeVisualization from '../components/MerkleTreeVisualization'
import ZKPScanner from '../components/ZKPScanner'
import { 
  User, 
  Camera, 
  FileText, 
  Shield, 
  TreePine, 
  CheckCircle, 
  AlertCircle,
  Upload,
  Database
} from 'lucide-react'

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

interface VerificationStep {
  id: string
  title: string
  description: string
  completed: boolean
  data?: any
  hash?: string
}

const ComprehensiveVerificationPage: React.FC = () => {
  const { address, isConnected } = useAlgorand()
  const [currentStep, setCurrentStep] = useState(0)
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([
    {
      id: 'user_registration',
      title: 'User Registration',
      description: 'Register user with smart contract',
      completed: false
    },
    {
      id: 'face_verification',
      title: 'Face Verification',
      description: 'Capture and verify face biometrics',
      completed: false
    },
    {
      id: 'aadhaar_verification',
      title: 'Aadhaar Verification',
      description: 'Extract and verify Aadhaar data',
      completed: false
    },
    {
      id: 'income_verification',
      title: 'Income Verification',
      description: 'Verify income documents',
      completed: false
    },
    {
      id: 'merkle_tree',
      title: 'Merkle Tree Generation',
      description: 'Generate Merkle tree for ZKP',
      completed: false
    },
    {
      id: 'ipfs_storage',
      title: 'IPFS Storage',
      description: 'Store hashes in IPFS',
      completed: false
    },
    {
      id: 'zkp_verification',
      title: 'ZKP Verification',
      description: 'Generate and verify zero-knowledge proof',
      completed: false
    }
  ])

  const [aadhaarData, setAadhaarData] = useState<AadhaarData | null>(null)
  const [faceHash, setFaceHash] = useState<string | null>(null)
  const [incomeData, setIncomeData] = useState<any>(null)
  const [merkleData, setMerkleData] = useState<string[]>([])
  const [ipfsHashes, setIpfsHashes] = useState<string[]>([])
  const [zkpData, setZkpData] = useState<any>(null)

  // Step 1: Register user with smart contract
  const registerUser = async () => {
    if (!address) {
      alert('Please connect your wallet first')
      return
    }

    try {
      console.log('🔄 Registering user with smart contract...')
      const result = await backendService.registerUser('user@example.com', '+1234567890')
      
      if (result.success) {
        updateStepStatus('user_registration', true)
        console.log('✅ User registered successfully')
      } else {
        throw new Error(result.error || 'Registration failed')
      }
    } catch (error) {
      console.error('❌ User registration failed:', error)
      alert('User registration failed. Please try again.')
    }
  }

  // Step 2: Face verification
  const handleFaceVerification = async (faceData: any) => {
    try {
      console.log('🔄 Processing face verification...')
      
      // Generate face hash
      const hash = generateFaceHash(faceData)
      setFaceHash(hash)
      
      // Store face data + hash in IPFS
      const ipfsData = {
        type: 'face_verification',
        data: faceData,
        hash: hash,
        timestamp: Date.now()
      }
      
      // Store in IPFS (not smart contract)
      const ipfsHash = await storeAadhaarVerification(ipfsData)
      
      // Only tick verification checklist in smart contract (no data)
      const result = await backendService.markVerificationComplete(
        address || 'user', // targetUser
        1, // verificationType (face)
        1 // verifierId
      )

      if (result.success) {
        updateStepStatus('face_verification', true, faceData, ipfsHash)
        console.log('✅ Face verification completed - data stored in IPFS:', ipfsHash)
      }
    } catch (error) {
      console.error('❌ Face verification failed:', error)
    }
  }

  // Step 3: Aadhaar verification
  const handleAadhaarData = async (data: AadhaarData) => {
    try {
      console.log('🔄 Processing Aadhaar data...')
      setAadhaarData(data)
      
      // Generate Aadhaar hash
      const hash = generateAadhaarHash(data)
      
      // Store Aadhaar data + hash in IPFS
      const ipfsData = {
        type: 'aadhaar_verification',
        data: data,
        hash: hash,
        timestamp: Date.now()
      }
      
      // Store in IPFS (not smart contract)
      const ipfsHash = await storeAadhaarVerification(ipfsData)
      
      // Only tick verification checklist in smart contract (no data)
      const result = await backendService.markVerificationComplete(
        address || 'user', // targetUser
        2, // verificationType (aadhaar)
        1 // verifierId
      )

      if (result.success) {
        updateStepStatus('aadhaar_verification', true, data, ipfsHash)
        console.log('✅ Aadhaar verification completed - data stored in IPFS:', ipfsHash)
      }
    } catch (error) {
      console.error('❌ Aadhaar verification failed:', error)
    }
  }

  // Step 4: Income verification
  const handleIncomeVerification = async (incomeData: any) => {
    try {
      console.log('🔄 Processing income verification...')
      setIncomeData(incomeData)
      
      // Generate income hash
      const hash = generateIncomeHash(incomeData)
      
      // Store income data + hash in IPFS
      const ipfsData = {
        type: 'income_verification',
        data: incomeData,
        hash: hash,
        timestamp: Date.now()
      }
      
      // Store in IPFS (not smart contract)
      const ipfsHash = await storeAadhaarVerification(ipfsData)
      
      // Only tick verification checklist in smart contract (no data)
      const result = await backendService.markVerificationComplete(
        address || 'user', // targetUser
        3, // verificationType (income)
        1 // verifierId
      )

      if (result.success) {
        updateStepStatus('income_verification', true, incomeData, ipfsHash)
        console.log('✅ Income verification completed - data stored in IPFS:', ipfsHash)
      }
    } catch (error) {
      console.error('❌ Income verification failed:', error)
    }
  }

  // Step 5: Generate Merkle tree
  const handleMerkleTreeGenerated = (hashes: string[]) => {
    setMerkleData(hashes)
    updateStepStatus('merkle_tree', true, hashes)
    console.log('✅ Merkle tree generated with', hashes.length, 'hashes')
  }

  // Step 6: Store Merkle Tree in IPFS
  const storeMerkleTreeInIPFS = async () => {
    try {
      console.log('🔄 Storing Merkle tree in IPFS...')
      
      const merkleTreeData = {
        type: 'merkle_tree',
        leaves: merkleData,
        root: merkleData[merkleData.length - 1], // Root hash
        timestamp: Date.now(),
        verificationTypes: ['face', 'aadhaar', 'income']
      }

      const ipfsHash = await storeAadhaarVerification(merkleTreeData)
      setIpfsHashes([ipfsHash])
      
      updateStepStatus('ipfs_storage', true, { ipfsHash })
      console.log('✅ Merkle tree stored in IPFS:', ipfsHash)
    } catch (error) {
      console.error('❌ IPFS storage failed:', error)
    }
  }

  // Step 7: ZKP verification
  const handleZKPData = (data: any) => {
    setZkpData(data)
    updateStepStatus('zkp_verification', true, data)
    console.log('✅ ZKP data received')
  }

  // Utility functions
  const generateFaceHash = (faceData: any): string => {
    return `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const generateAadhaarHash = (data: AadhaarData): string => {
    const combined = `${data.name}_${data.aadhaarNumber}_${data.dob}`
    return `aadhaar_${btoa(combined).substr(0, 16)}`
  }

  const generateIncomeHash = (data: any): string => {
    return `income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const updateStepStatus = (stepId: string, completed: boolean, data?: any, hash?: string) => {
    setVerificationSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, completed, data, hash }
          : step
      )
    )
  }

  const nextStep = () => {
    if (currentStep < verificationSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderCurrentStep = () => {
    const step = verificationSteps[currentStep]

    switch (step.id) {
      case 'user_registration':
        return (
          <div className="text-center space-y-6">
            <User className="h-16 w-16 mx-auto text-blue-600" />
            <h2 className="text-2xl font-bold">User Registration</h2>
            <p className="text-gray-600">Register your account with the smart contract</p>
            <button
              type="button"
              onClick={registerUser}
              disabled={!isConnected}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
            >
              {isConnected ? 'Register User' : 'Connect Wallet First'}
            </button>
          </div>
        )

      case 'face_verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold">Face Verification</h2>
              <p className="text-gray-600">Capture your face for biometric verification</p>
            </div>
            {/* Face verification component would go here */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">Face verification component integration needed</p>
            </div>
          </div>
        )

      case 'aadhaar_verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-purple-600" />
              <h2 className="text-2xl font-bold">Aadhaar Verification</h2>
              <p className="text-gray-600">Scan your Aadhaar QR code to extract data</p>
            </div>
            <QRCodeScanner
              onDataExtracted={handleAadhaarData}
              onError={(error) => console.error('Aadhaar error:', error)}
            />
          </div>
        )

      case 'income_verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-orange-600" />
              <h2 className="text-2xl font-bold">Income Verification</h2>
              <p className="text-gray-600">Upload your income documents</p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">Income verification component integration needed</p>
            </div>
          </div>
        )

      case 'merkle_tree':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <TreePine className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold">Merkle Tree Generation</h2>
              <p className="text-gray-600">Generate Merkle tree for zero-knowledge proof</p>
            </div>
            <MerkleTreeVisualization
              data={[faceHash, aadhaarData?.rawData, incomeData].filter(Boolean) as string[]}
              onHashGenerated={handleMerkleTreeGenerated}
            />
          </div>
        )

      case 'ipfs_storage':
        return (
          <div className="text-center space-y-6">
            <Database className="h-16 w-16 mx-auto text-blue-600" />
            <h2 className="text-2xl font-bold">IPFS Storage</h2>
            <p className="text-gray-600">Store verification data in IPFS</p>
            <button
              type="button"
              onClick={storeMerkleTreeInIPFS}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Store Merkle Tree in IPFS
            </button>
          </div>
        )

      case 'zkp_verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto text-indigo-600" />
              <h2 className="text-2xl font-bold">ZKP Verification</h2>
              <p className="text-gray-600">Scan or upload zero-knowledge proof data</p>
            </div>
            <ZKPScanner
              onDataExposed={handleZKPData}
              onError={(error) => console.error('ZKP error:', error)}
            />
          </div>
        )

      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Comprehensive Identity Verification
          </h1>
          <p className="text-gray-600">
            Complete verification workflow with smart contract integration
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {verificationSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${step.completed 
                    ? 'bg-green-600 text-white' 
                    : index === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {step.completed ? <CheckCircle className="h-5 w-5" /> : index + 1}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${step.completed ? 'text-green-600' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                </div>
                {index < verificationSteps.length - 1 && (
                  <div className={`w-16 h-1 mx-4 ${step.completed ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            Previous
          </button>
          
          <button
            type="button"
            onClick={nextStep}
            disabled={currentStep === verificationSteps.length - 1}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
          >
            Next
          </button>
        </div>

        {/* Summary */}
        {verificationSteps.every(step => step.completed) && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Verification Complete!</h3>
            </div>
            <p className="text-green-700">
              All verification steps have been completed successfully. Your identity has been verified and stored securely.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComprehensiveVerificationPage
