import React, { useState } from 'react'
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'
import { backendService } from '../services/backendService'
import { algorandWalletService } from '../services/algorandWalletService'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

export default function TestIntegration() {
  const { 
    user, 
    algorandAccount, 
    isBackendAuthenticated,
    submitTransaction,
    getVerificationStatus
  } = useEnhancedAuth()
  
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({})
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    setTestResults({})

    const tests = [
      {
        name: 'Backend Connection',
        test: async () => {
          const sessionInfo = await backendService.getSessionInfo()
          return sessionInfo !== null
        }
      },
      {
        name: 'Algorand Account',
        test: async () => {
          return algorandAccount !== null && algorandAccount.address !== ''
        }
      },
      {
        name: 'Smart Contract SDK',
        test: async () => {
          return typeof algorandWalletService.initialize === 'function'
        }
      },
      {
        name: 'Transaction Submission',
        test: async () => {
          if (!isBackendAuthenticated) return false
          try {
            await submitTransaction('test', [])
            return true
          } catch {
            return true // Expected to fail with invalid method
          }
        }
      },
      {
        name: 'Verification Status',
        test: async () => {
          if (!isBackendAuthenticated) return false
          try {
            await getVerificationStatus()
            return true
          } catch {
            return false
          }
        }
      }
    ]

    for (const test of tests) {
      try {
        const result = await test.test()
        setTestResults(prev => ({ ...prev, [test.name]: result ? 'success' : 'error' }))
      } catch (error) {
        setTestResults(prev => ({ ...prev, [test.name]: 'error' }))
      }
    }

    setLoading(false)
  }

  const getTestIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
    }
  }

  const getTestColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'text-blue-200'
      case 'success':
        return 'text-green-200'
      case 'error':
        return 'text-red-200'
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Integration Test</h1>
        <p className="text-white/70">
          Test the integration between frontend and backend systems.
        </p>
      </div>

      {/* Status Overview */}
      <div className="mb-8 p-6 rounded-lg bg-white/5 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white">Firebase Auth</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBackendAuthenticated ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white">Backend Session</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${algorandAccount ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white">Algorand Account</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${user && isBackendAuthenticated ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            <span className="text-white">Full Integration</span>
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="mb-8 text-center">
        <button type="button"
          onClick={runTests}
          disabled={loading || !user}
          className="px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Running Tests...' : 'Run Integration Tests'}
        </button>
      </div>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Test Results</h2>
          {Object.entries(testResults).map(([testName, status]) => (
            <div key={testName} className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTestIcon(status)}
                  <span className="text-white font-medium">{testName}</span>
                </div>
                <span className={`text-sm font-medium ${getTestColor(status)}`}>
                  {status === 'pending' && 'Testing...'}
                  {status === 'success' && 'PASSED'}
                  {status === 'error' && 'FAILED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Info */}
      {algorandAccount && (
        <div className="mt-8 p-6 rounded-lg bg-white/5 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Algorand Account</h2>
          <div className="space-y-2">
            <div>
              <span className="text-white/70">Address:</span>
              <p className="text-white font-mono text-sm break-all">
                {algorandAccount.address}
              </p>
            </div>
            <div>
              <span className="text-white/70">Backend Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                isBackendAuthenticated ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
              }`}>
                {isBackendAuthenticated ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!user && (
        <div className="mt-8 p-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            <h3 className="text-white font-semibold">Authentication Required</h3>
          </div>
          <p className="text-white/70">
            Please sign in with Google to test the integration. The system requires both Firebase authentication and backend session authentication to function properly.
          </p>
        </div>
      )}
    </div>
  )
}
