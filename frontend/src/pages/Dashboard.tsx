import { useAlgorand } from '../algorand/AlgorandProvider'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'
import { CheckCircle, Clock, AlertCircle, User, Shield, Award } from 'lucide-react'

export default function Dashboard() {
  const { address: user, isConnected } = useAlgorand()
  const { userProfile, algorandAccount, isBackendAuthenticated } = useEnhancedAuth()

  const shorten = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-xl">
          <img src="/images/parliament.svg" alt="Parliament" className="absolute inset-0 h-40 w-full object-cover opacity-40" />
          <div className="relative h-40 grid content-center p-6 bg-gradient-to-r from-[#0b1f3a]/60 via-transparent to-transparent">
            <div className="text-xl font-semibold text-white drop-shadow">Citizen Dashboard</div>
            <div className="text-sm text-white/80 drop-shadow">
              Welcome {userProfile?.displayName || 'Citizen'}, check your verification progress and take quick actions
            </div>
          </div>
        </section>

        <section className="glass p-6 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-semibold text-white">
                Welcome {user ? shorten(user) : 'Citizen'}
              </div>
              <div className="text-slate-300 text-sm">
                {isConnected ? 'Algorand wallet connected' : 'Connect your Algorand wallet to see your verification status.'}
              </div>
            </div>
            <div className="text-sm">
              <a className="underline text-blue-400 hover:text-blue-300" href="/wizard">
                Start Verification →
              </a>
            </div>
          </div>

          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium text-white">
                  {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
                </span>
              </div>
              {isConnected && user && (
                <div className="mt-2 text-xs text-slate-300">
                  {shorten(user)}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isBackendAuthenticated ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className="text-sm font-medium text-white">
                  {isBackendAuthenticated ? 'Backend Authenticated' : 'Backend Pending'}
                </span>
              </div>
              {isBackendAuthenticated && algorandAccount && (
                <div className="mt-2 text-xs text-slate-300">
                  Smart Contract: {shorten(algorandAccount.address)}
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-white">Identity</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-300">Pending</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-white">Face Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-300">Pending</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-white">Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-slate-300">Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/face-verification"
                className="p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-white">Face Verification</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Complete biometric verification
                </div>
              </a>

              <a
                href="/wizard"
                className="p-4 rounded-lg bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 hover:border-green-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-white">Complete Verification</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Go through the full verification process
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}