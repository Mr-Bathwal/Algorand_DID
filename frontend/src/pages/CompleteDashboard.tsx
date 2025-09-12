import React, { useState, useEffect } from 'react'
import { useAlgorand } from '../algorand/AlgorandProvider'
import { backendService } from '../services/backendService'
import { 
  User, 
  Shield, 
  Award, 
  Wallet, 
  TrendingUp, 
  FileText, 
  Users, 
  Settings,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface DashboardStats {
  trustScore: number
  verifications: number
  certificates: number
  badges: number
  walletBalance: number
  smartWalletCreated: boolean
}

const CompleteDashboard: React.FC = () => {
  const { address, isConnected } = useAlgorand()
  const [stats, setStats] = useState<DashboardStats>({
    trustScore: 0,
    verifications: 0,
    certificates: 0,
    badges: 0,
    walletBalance: 0,
    smartWalletCreated: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData()
    }
  }, [isConnected, address])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load user profile and stats
      const profileResult = await backendService.getUserProfile(address || '')
      const trustScoreResult = await backendService.getTrustScore(address || '')
      const walletInfoResult = await backendService.getWalletInfo(address || '')
      
      setStats({
        trustScore: trustScoreResult.data?.score || 0,
        verifications: profileResult.data?.verifications?.length || 0,
        certificates: profileResult.data?.certificates?.length || 0,
        badges: profileResult.data?.badges?.length || 0,
        walletBalance: walletInfoResult.data?.balance || 0,
        smartWalletCreated: walletInfoResult.data?.created || false
      })
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setNotifications(prev => [...prev, 'Failed to load some dashboard data'])
    } finally {
      setIsLoading(false)
    }
  }

  const createSmartWallet = async () => {
    try {
      setIsLoading(true)
      const result = await backendService.createSmartWallet(1, 1, 1000000) // 1 guardian, threshold 1, 1 ALGO daily limit
      
      if (result.success) {
        setNotifications(prev => [...prev, 'Smart wallet created successfully!'])
        await loadDashboardData()
      } else {
        setNotifications(prev => [...prev, 'Failed to create smart wallet'])
      }
    } catch (error) {
      console.error('Smart wallet creation failed:', error)
      setNotifications(prev => [...prev, 'Smart wallet creation failed'])
    } finally {
      setIsLoading(false)
    }
  }

  const initializeTrustScore = async () => {
    try {
      setIsLoading(true)
      const result = await backendService.initializeTrustScore(address || '')
      
      if (result.success) {
        setNotifications(prev => [...prev, 'Trust score initialized!'])
        await loadDashboardData()
      } else {
        setNotifications(prev => [...prev, 'Failed to initialize trust score'])
      }
    } catch (error) {
      console.error('Trust score initialization failed:', error)
      setNotifications(prev => [...prev, 'Trust score initialization failed'])
    } finally {
      setIsLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, action }: {
    title: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
    action?: () => void
  }) => (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${action ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`} onClick={action}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Identity Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your digital identity, verifications, and smart wallet
          </p>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.map((notification, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800">{notification}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Trust Score"
            value={stats.trustScore}
            icon={TrendingUp}
            color="text-green-600"
          />
          <StatCard
            title="Verifications"
            value={stats.verifications}
            icon={Shield}
            color="text-blue-600"
          />
          <StatCard
            title="Certificates"
            value={stats.certificates}
            icon={Award}
            color="text-purple-600"
          />
          <StatCard
            title="Badges"
            value={stats.badges}
            icon={FileText}
            color="text-orange-600"
          />
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Smart Wallet
            </h2>
            {!stats.smartWalletCreated && (
              <button
                type="button"
                onClick={createSmartWallet}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Create Wallet
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`font-medium ${stats.smartWalletCreated ? 'text-green-600' : 'text-red-600'}`}>
                {stats.smartWalletCreated ? 'Active' : 'Not Created'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="font-medium">{stats.walletBalance} microALGO</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-mono text-sm">{address?.substring(0, 10)}...</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity Verification</h3>
            <p className="text-gray-600 mb-4">Complete your identity verification process</p>
            <button
              type="button"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Start Verification
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trust Score</h3>
            <p className="text-gray-600 mb-4">Initialize or update your trust score</p>
            <button
              type="button"
              onClick={initializeTrustScore}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
            >
              Initialize Trust Score
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificates</h3>
            <p className="text-gray-600 mb-4">View and manage your certificates</p>
            <button
              type="button"
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              View Certificates
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Wallet Connected</p>
                <p className="text-sm text-gray-600">Connected to Algorand Testnet</p>
              </div>
            </div>
            
            {stats.smartWalletCreated && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Smart Wallet Created</p>
                  <p className="text-sm text-gray-600">Wallet is ready for transactions</p>
                </div>
              </div>
            )}
            
            {stats.trustScore > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Trust Score Initialized</p>
                  <p className="text-sm text-gray-600">Current score: {stats.trustScore}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompleteDashboard
