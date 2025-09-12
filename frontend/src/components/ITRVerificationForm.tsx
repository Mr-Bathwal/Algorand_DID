import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Download, FileText, Loader2, Shield } from 'lucide-react';

interface FormData {
  panNumber: string;
  phoneNumber: string;
  aadhaarNumber: string;
  password: string;
}

interface ExtractedData {
  assessmentYear: string | null;
  dateOfFiling: string | null;
  totalIncome: string | null;
}

interface ApiResponse {
  linked?: boolean;
  message?: string;
  extractedData?: ExtractedData;
  ipfsHash?: string;
  metadataHash?: string;
}

interface ITRVerificationFormProps {
  onVerificationComplete?: (success: boolean, data?: any) => void;
}

const ITRVerificationForm: React.FC<ITRVerificationFormProps> = ({ onVerificationComplete }) => {
  const [formData, setFormData] = useState<FormData>({
    panNumber: '',
    phoneNumber: '',
    aadhaarNumber: '',
    password: ''
  });

  const [status, setStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [isAadhaarPanLinked, setIsAadhaarPanLinked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus(message);
    setStatusType(type);
  };

  const checkAadhaarPanLinkage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-aadhaar-pan-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panNumber: formData.panNumber,
          aadhaarNumber: formData.aadhaarNumber
        }),
      });

      const data: ApiResponse = await response.json();
      
      if (response.ok && data.linked) {
        setIsAadhaarPanLinked(true);
        updateStatus('✅ Your Aadhaar and PAN are linked successfully!', 'success');
      } else {
        updateStatus('❌ Aadhaar and PAN are not linked. Please link them first.', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateStatus(`Error checking linkage: ${errorMessage}`, 'error');
    }
    setLoading(false);
  };

  const downloadAndProcessITR = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verify-and-extract-itr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          panNumber: formData.panNumber,
          phoneNumber: formData.phoneNumber,
          password: formData.password
        }),
      });

      const data: ApiResponse = await response.json();
      
      if (response.ok && data.extractedData && data.ipfsHash) {
        setExtractedData(data.extractedData);
        setIpfsHash(data.ipfsHash);
        updateStatus(`✅ ITR verified and stored successfully!\n📋 Assessment Year: ${data.extractedData.assessmentYear}\n📅 Filing Date: ${data.extractedData.dateOfFiling}\n💰 Certified Income: ₹${parseInt(data.extractedData.totalIncome || '0').toLocaleString('en-IN')}\n🌐 IPFS Hash: ${data.ipfsHash}`, 'success');
        
        // Call the completion callback
        if (onVerificationComplete) {
          onVerificationComplete(true, {
            extractedData: data.extractedData,
            ipfsHash: data.ipfsHash,
            metadataHash: data.metadataHash
          });
        }
      } else {
        throw new Error(data.message || 'Failed to verify ITR');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateStatus(`Error verifying ITR: ${errorMessage}`, 'error');
    }
    setLoading(false);
  };

  const getStatusIcon = () => {
    switch (statusType) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBgColor = () => {
    switch (statusType) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="w-12 h-12 text-blue-600 mr-3" />
          <h2 className="text-3xl font-bold text-gray-800">ITR Income Verification</h2>
        </div>
        <p className="text-gray-600">Automated verification and IPFS storage of certified income from Government IT Portal</p>
        <div className="text-sm text-blue-600 mt-2">
          🔒 Direct Government Portal Access • 🌐 IPFS Blockchain Storage • ✅ Certified Income Data
        </div>
      </div>
      
      {/* Step 1: Aadhaar-PAN Linkage Check */}
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">1</span>
            Verify Aadhaar-PAN Linkage
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="Enter 10-digit PAN"
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter 12-digit Aadhaar"
                maxLength={12}
              />
            </div>
          </div>

          <button
            onClick={checkAadhaarPanLinkage}
            disabled={loading || !formData.panNumber || !formData.aadhaarNumber}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking Linkage...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Check Aadhaar-PAN Linkage
              </>
            )}
          </button>
        </div>

        {/* Step 2: ITR Download (only if linked) */}
        {isAadhaarPanLinked && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-green-800">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">2</span>
              Verify & Extract ITR Data
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter registered mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  E-filing Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter e-filing password"
                />
              </div>
            </div>

            <div className="mt-2 mb-4">
              <p className="text-xs text-gray-600">
                Forgot password? 
                <a 
                  href="https://www.incometax.gov.in/iec/foportal/forgotPassword" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 ml-1 underline"
                >
                  Reset here
                </a>
              </p>
            </div>

            <button
              onClick={downloadAndProcessITR}
              disabled={loading || !formData.phoneNumber || !formData.password}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying ITR...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify & Extract ITR Data
                </>
              )}
            </button>
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className={`p-4 rounded-lg border flex items-start space-x-3 ${getStatusBgColor()}`}>
            {getStatusIcon()}
            <p className="text-sm flex-1 leading-relaxed">{status}</p>
          </div>
        )}

        {/* Verified ITR Data Display */}
        {extractedData && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
            <h3 className="font-bold mb-6 flex items-center text-green-800 text-lg">
              <FileText className="w-6 h-6 mr-2" />
              ✅ Verified ITR Data - Stored on IPFS
            </h3>
            
            {/* Key Verification Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-sm font-medium text-gray-600">Assessment Year</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {extractedData.assessmentYear || 'N/A'}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <p className="text-sm font-medium text-gray-600">Date of Filing</p>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {extractedData.dateOfFiling || 'N/A'}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <p className="text-sm font-medium text-gray-600">Certified Annual Income</p>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {extractedData.totalIncome ? `₹${parseInt(extractedData.totalIncome).toLocaleString('en-IN')}` : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* IPFS Storage Information */}
            {ipfsHash && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
                  <p className="text-sm font-semibold text-purple-800">Decentralized Storage (IPFS)</p>
                </div>
                <code className="text-xs font-mono text-purple-700 break-all bg-white p-2 rounded block">
                  {ipfsHash}
                </code>
                <p className="text-xs text-purple-600 mt-2">
                  🔒 Your verified income data is now permanently stored on the decentralized IPFS network
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button type="button"
                onClick={() => ipfsHash && navigator.clipboard.writeText(ipfsHash)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <span className="mr-2">📋</span>
                Copy IPFS Hash
              </button>
              <button type="button"
                onClick={() => {
                  const data = {
                    assessmentYear: extractedData.assessmentYear,
                    dateOfFiling: extractedData.dateOfFiling,
                    certifiedIncome: extractedData.totalIncome,
                    ipfsHash: ipfsHash,
                    verificationTime: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ITR_Verification_${extractedData.assessmentYear}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <span className="mr-2">⬇️</span>
                Download Certificate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Verification Process</p>
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <p>• 🔑 Your credentials are used only to access your ITR data and are never stored</p>
              <p>• 📱 Direct automation of Income Tax E-filing portal for real-time verification</p>
              <p>• 🌐 Only verified income data is stored on IPFS - credentials are discarded immediately</p>
              <p>• 🔒 Blockchain-ready hash generation for decentralized identity verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITRVerificationForm;
