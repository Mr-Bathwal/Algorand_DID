import { useState } from 'react'
// Removed Ethereum dependencies - using Algorand only
import { useAlgorand } from '../../algorand/AlgorandProvider'
import { backendService } from '../../services/backendService'
import ITRVerificationForm from '../../components/ITRVerificationForm'

interface VerificationData {
  assessmentYear: string
  dateOfFiling: string
  totalIncome: string
  ipfsHash: string
}

export default function IncomeProof({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  // Blockchain integration state
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [income, setIncome] = useState('')
  // Using Algorand smart contracts instead of Ethereum
  const { address } = useAlgorand()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Handle ITR verification completion
  const handleVerificationComplete = (success: boolean, data: any) => {
    if (success && data?.extractedData) {
      const verificationData: VerificationData = {
        assessmentYear: data.extractedData.assessmentYear || '',
        dateOfFiling: data.extractedData.dateOfFiling || '',
        totalIncome: data.extractedData.totalIncome || '',
        ipfsHash: data.ipfsHash || ''
      }
      
      setVerificationData(verificationData)
      setIncome(verificationData.totalIncome)
    }
  }

  async function submit() {
    if (!address) return alert('Set UserIdentityRegistry address in Settings')
    if (!verificationData) return alert('Complete ITR verification first')
    if (!income) return alert('Enter annual income')
    
    // Generate hash from IPFS hash for blockchain
    const hashFromIPFS = verificationData.ipfsHash.startsWith('0x') 
      ? (verificationData.ipfsHash as `0x${string}`)
      : (`0x${verificationData.ipfsHash}` as `0x${string}`)
    
    // TODO: Implement Algorand smart contract call
    console.log('Algorand transaction would be submitted here:', { 
      address, 
      hashFromIPFS, 
      income: income.replace(/[^\d]/g, '') || '0' 
    })
    setIsSuccess(true)
  }

  return (
    <div className="space-y-6">
      {/* ITR Verification Form */}
      <ITRVerificationForm onVerificationComplete={handleVerificationComplete} />
      
      {/* Blockchain Integration Section */}
      {verificationData && (
        <div className="glass p-6 rounded-lg border border-slate-200 bg-white/10 backdrop-blur">
          <div className="font-semibold mb-4 text-white text-lg">🔗 Blockchain Integration</div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-300 font-medium mb-3">✅ Verified Data Ready</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Assessment Year:</span>
                  <span className="text-white ml-2">{verificationData.assessmentYear}</span>
                </div>
                <div>
                  <span className="text-slate-400">Filing Date:</span>
                  <span className="text-white ml-2">{verificationData.dateOfFiling}</span>
                </div>
                <div>
                  <span className="text-slate-400">Certified Income:</span>
                  <span className="text-green-300 ml-2 font-mono">₹{parseInt(verificationData.totalIncome).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm text-slate-300">
                Annual Income (editable)
              </label>
              <input 
                className="w-full px-3 py-2 rounded-md bg-slate-700 text-white border border-slate-600 focus:border-blue-500" 
                value={income} 
                onChange={e => setIncome(e.target.value)} 
                placeholder="e.g., 500000" 
              />
              <div className="text-xs text-slate-400">
                Auto-filled from verified ITR: ₹{parseInt(verificationData.totalIncome).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="text-purple-300 text-sm font-medium mb-2">🌐 IPFS Storage</div>
            <div className="text-xs font-mono text-slate-300 break-all mb-2">
              {verificationData.ipfsHash}
            </div>
            <div className="text-xs text-purple-200">
              Your verified income data is stored on IPFS and ready for blockchain submission
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button type="button" className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors" onClick={onBack}>
              ← Back
            </button>
            <button 
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                verificationData && income ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
              onClick={submit} 
              disabled={isPending || !verificationData || !income}
            >
              🔐 Submit Verified Income to Blockchain
            </button>
            {isPending && <span className="text-xs text-blue-300">Submitting to blockchain...</span>}
            {waiting && <span className="text-xs text-yellow-300">Waiting for confirmation...</span>}
            {isSuccess && (
              <button type="button" className="text-sm underline text-green-400 hover:text-green-300" onClick={onNext}>
                Continue to Next Step →
              </button>
            )}
            {error && <span className="text-xs text-red-400">{error.message}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

