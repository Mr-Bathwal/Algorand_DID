import React, { useState, useEffect } from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import { useAlgorand } from '../../algorand/AlgorandProvider'
import { algorandWalletService } from '../../services/algorandWalletService'
import { backendService } from '../../services/backendService'
import { UserIdentity, TrustScore, Certificates, Badges } from '../../lib/contractsSdk'
import TestIntegration from '../TestIntegration'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Award, 
  FileText, 
  Star,
  Loader2,
  AlertCircle,
  TestTube
} from 'lucide-react'

interface VerificationStatus {
  userRegistered: boolean
  trustScoreInitialized: boolean
  certificates: any[]
  badges: any[]
  trustScore: number
}

export default function AlgorandVerification() {
  const { 
    user, 
    algorandAccount, 
    isBackendAuthenticated,
    submitVerification,
    getUserCertificates,
    getUserBadges,
    getTrustScore
  } = useEnhancedAuth()
  
  const { address: walletAddress, isConnected } = useAlgorand()
  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    userRegistered: false,
    trustScoreInitialized: false,
    certificates: [],
    badges: [],
    trustScore: 0
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showTests, setShowTests] = useState(false)

  // Initialize wallet service when wallet is connected
  useEffect(() => {
    if (walletAddress && isConnected) {
      algorandWalletService.initialize({
        appId: 745680538, // Smart wallet app ID
        address: walletAddress,
        encryptedPrivateKey: '' // Not needed for read operations
      })
    }
  }, [walletAddress, isConnected])

  // Load verification status
  useEffect(() => {
    if (walletAddress && isConnected) {
      loadVerificationStatus()
    }
  }, [walletAddress, isConnected])

  const loadVerificationStatus = async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      // Load certificates, badges, and trust score from backend
      const [certificates, badges, trustScore] = await Promise.all([
        getUserCertificates().catch(() => []),
        getUserBadges().catch(() => []),
        getTrustScore().catch(() => ({ score: 0 }))
      ])

      setVerificationStatus(prev => ({
        ...prev,
        certificates: certificates.certificates || [],
        badges: badges.badges || [],
        trustScore: trustScore.score || 0
      }))
    } catch (error: any) {
      console.error('Failed to load verification status:', error)
      setError('Failed to load verification status')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterUser = async () => {
    if (!user || !walletAddress) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await backendService.registerUser(
        user.email || '',
        user.phoneNumber || '',
        walletAddress // Pass the connected wallet address
      )

      if (result.success) {
        setSuccess('User registered successfully on Algorand!')
        setVerificationStatus(prev => ({ ...prev, userRegistered: true }))
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Failed to register user')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to register user')
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeTrustScore = async () => {
    if (!walletAddress) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await algorandWalletService.initializeTrustScore(walletAddress)

      if (result.success) {
        setSuccess('Trust score initialized successfully!')
        setVerificationStatus(prev => ({ ...prev, trustScoreInitialized: true }))
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Failed to initialize trust score')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to initialize trust score')
    } finally {
      setLoading(false)
    }
  }

  const handleAddVerification = async (verificationType: number, verificationData: string) => {
    if (!walletAddress) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await algorandWalletService.addVerification(
        walletAddress,
        verificationType,
        1, // verifierId
        verificationData
      )

      if (result.success) {
        setSuccess('Verification added successfully!')
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Failed to add verification')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add verification')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected || !walletAddress) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Algorand Wallet Required</h2>
          <p className="text-white/70 mb-6">
            Please connect your Algorand wallet to access verification features.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Algorand Verification</h1>
            <p className="text-white/70">
              Manage your identity verification on the Algorand blockchain using smart contracts.
            </p>
          </div>
          <button type="button"
            onClick={() => setShowTests(!showTests)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
          >
            <TestTube className="h-4 w-4" />
            {showTests ? 'Hide Tests' : 'Show Tests'}
          </button>
        </div>
      </div>

      {/* Test Integration Component */}
      {showTests && (
        <div className="mb-8">
          <TestIntegration />
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="mb-8 p-6 rounded-lg bg-white/5 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-brand-400" />
          Smart Wallet Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-white/70">Address:</span>
            <p className="text-white font-mono text-sm break-all">
              {walletAddress}
            </p>
          </div>
          <div>
            <span className="text-white/70">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400">Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Setup */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Setup Steps</h2>
        <div className="space-y-4">
          {/* Register User */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  verificationStatus.userRegistered ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {verificationStatus.userRegistered ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-white font-medium">Register User Identity</h3>
                  <p className="text-white/70 text-sm">Register your identity on the Algorand blockchain</p>
                </div>
              </div>
              <button type="button"
                onClick={handleRegisterUser}
                disabled={loading || verificationStatus.userRegistered}
                className="px-4 py-2 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-200 border border-brand-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register'}
              </button>
            </div>
          </div>

          {/* Initialize Trust Score */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  verificationStatus.trustScoreInitialized ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {verificationStatus.trustScoreInitialized ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-white font-medium">Initialize Trust Score</h3>
                  <p className="text-white/70 text-sm">Set up your trust score system</p>
                </div>
              </div>
              <button type="button"
                onClick={handleInitializeTrustScore}
                disabled={loading || verificationStatus.trustScoreInitialized}
                className="px-4 py-2 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-200 border border-brand-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Initialize'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trust Score */}
        <div className="p-6 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-6 w-6 text-yellow-400" />
            <h3 className="text-white font-semibold">Trust Score</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {verificationStatus.trustScore}
          </div>
          <p className="text-white/70 text-sm">Based on verifications and endorsements</p>
        </div>

        {/* Certificates */}
        <div className="p-6 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-blue-400" />
            <h3 className="text-white font-semibold">Certificates</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {verificationStatus.certificates.length}
          </div>
          <p className="text-white/70 text-sm">Issued certificates</p>
        </div>

        {/* Badges */}
        <div className="p-6 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-6 w-6 text-purple-400" />
            <h3 className="text-white font-semibold">Badges</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {verificationStatus.badges.length}
          </div>
          <p className="text-white/70 text-sm">Earned badges</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button type="button"
            onClick={() => handleAddVerification(1, 'Face verification')}
            disabled={loading}
            className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
          >
            <h3 className="text-white font-medium mb-1">Add Face Verification</h3>
            <p className="text-white/70 text-sm">Record face verification on blockchain</p>
          </button>
          
          <button type="button"
            onClick={() => handleAddVerification(2, 'Document verification')}
            disabled={loading}
            className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
          >
            <h3 className="text-white font-medium mb-1">Add Document Verification</h3>
            <p className="text-white/70 text-sm">Record document verification on blockchain</p>
          </button>
        </div>
      </div>
    </div>
  )
}
