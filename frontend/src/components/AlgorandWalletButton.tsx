import React, { useState } from 'react'
import { useAlgorand } from '../algorand/AlgorandProvider'
import { Wallet, X, CheckCircle, AlertCircle } from 'lucide-react'

export default function AlgorandWalletButton() {
  const { address, isConnected, connectPera, connectDefly, disconnect } = useAlgorand()
  const [showWalletOptions, setShowWalletOptions] = useState(false)

  // If wallet is connected, show disconnect option
  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm font-medium text-white">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          type="button"
          onClick={disconnect}
          className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-red-200 transition-all duration-200 text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    )
  }

  const handleConnectPera = async () => {
    try {
      await connectPera()
      setShowWalletOptions(false)
    } catch (error) {
      console.error('Pera connection failed:', error)
    }
  }

  const handleConnectDefly = async () => {
    try {
      await connectDefly()
      setShowWalletOptions(false)
    } catch (error) {
      console.error('Defly connection failed:', error)
    }
  }

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setShowWalletOptions(!showWalletOptions)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Wallet size={18} />
        Connect Algorand Wallet
      </button>
      
      {showWalletOptions && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowWalletOptions(false)}
          />
          
          {/* Wallet Options Modal */}
          <div className="absolute right-0 mt-2 w-80 bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
                <button
                  type="button"
                  onClick={() => setShowWalletOptions(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-white/70 mb-4">
                  Choose your preferred Algorand wallet to connect
                </p>
                
                {/* Pera Wallet */}
                <button
                  type="button"
                  onClick={handleConnectPera}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 hover:from-green-500/20 hover:to-blue-500/20 border border-green-500/30 hover:border-green-500/50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-green-500/25 transition-all duration-200">
                    <span className="text-xl font-bold text-white">P</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white group-hover:text-green-300 transition-colors">
                      Pera Wallet
                    </div>
                    <div className="text-sm text-white/60">
                      Official Algorand wallet
                    </div>
                  </div>
                  <CheckCircle size={20} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                {/* Defly Wallet */}
                <button
                  type="button"
                  onClick={handleConnectDefly}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-all duration-200">
                    <span className="text-xl font-bold text-white">D</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white group-hover:text-orange-300 transition-colors">
                      Defly Wallet
                    </div>
                    <div className="text-sm text-white/60">
                      Multi-chain DeFi wallet
                    </div>
                  </div>
                  <CheckCircle size={20} className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <AlertCircle size={14} />
                  <span>Make sure you have the wallet installed</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
