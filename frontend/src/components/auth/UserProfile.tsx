import React, { useState } from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

interface UserProfileProps {
  onClose?: () => void
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { 
    user, 
    userProfile, 
    algorandAccount, 
    isBackendAuthenticated,
    updateUserProfile, 
    linkWallet, 
    unlinkWallet, 
    signOut, 
    updateUserPassword,
    getVerificationStatus,
    getUserCertificates,
    getUserBadges,
    getTrustScore
  } = useEnhancedAuth()
  const { t, language, setLanguage } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [walletAddress, setWalletAddress] = useState(userProfile?.walletAddress || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleUpdateProfile = async (updates: Partial<typeof userProfile>) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await updateUserProfile(updates)
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkWallet = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await linkWallet(walletAddress.trim())
      setMessage('Wallet linked successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to link wallet')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkWallet = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await unlinkWallet()
      setWalletAddress('')
      setMessage('Wallet unlinked successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to unlink wallet')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await updateUserPassword(passwordForm.currentPassword, passwordForm.newPassword)
      setMessage('Password updated successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      onClose?.()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (!user || !userProfile) return null

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass p-8 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <img src="/images/ashoka.svg" alt="Profile" className="h-8 w-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{userProfile.displayName}</h2>
              <p className="text-white/70">{userProfile.email}</p>
            </div>
          </div>
          <button type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Display Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={userProfile.displayName}
                    onChange={(e) => handleUpdateProfile({ displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                ) : (
                  <p className="text-white/70">{userProfile.displayName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Email</label>
                <p className="text-white/70">{userProfile.email}</p>
              </div>
            </div>
          </div>

          {/* Wallet Connection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Wallet Connection</h3>
            {userProfile.walletAddress ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-white/70 mb-1">Connected Wallet</p>
                  <p className="text-white font-mono text-sm">
                    {userProfile.walletAddress.slice(0, 6)}...{userProfile.walletAddress.slice(-4)}
                  </p>
                </div>
                <button type="button"
                  onClick={handleUnlinkWallet}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition-colors disabled:opacity-50"
                >
                  Unlink Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                />
                <button type="button"
                  onClick={handleLinkWallet}
                  disabled={loading || !walletAddress.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-200 border border-brand-500/30 transition-colors disabled:opacity-50"
                >
                  Link Wallet
                </button>
              </div>
            )}
          </div>

          {/* Algorand Account */}
          {algorandAccount && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Algorand Smart Wallet</h3>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/70">Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">
                      {algorandAccount.address.slice(0, 8)}...{algorandAccount.address.slice(-8)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isBackendAuthenticated ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'
                    }`}>
                      {isBackendAuthenticated ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-white/50">
                  Smart wallet with guardian protection and recovery features
                </div>
              </div>
            </div>
          )}

          {/* Verification Status */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(userProfile.verificationStatus).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-white/70 capitalize">{key.replace('Verified', ' Verification')}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    value ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
                  }`}>
                    {value ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Language</label>
                <select
                  value={userProfile.preferences.language}
                  onChange={(e) => handleUpdateProfile({ 
                    preferences: { 
                      ...userProfile.preferences, 
                      language: e.target.value 
                    } 
                  })}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="bn">বাংলা</option>
                  <option value="ta">தமிழ்</option>
                  <option value="te">తెలుగు</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white/90">Enable Notifications</label>
                  <p className="text-xs text-white/60">Receive updates about your verification status</p>
                </div>
                <input
                  type="checkbox"
                  checked={userProfile.preferences.notifications}
                  onChange={(e) => handleUpdateProfile({ 
                    preferences: { 
                      ...userProfile.preferences, 
                      notifications: e.target.checked 
                    } 
                  })}
                  className="h-4 w-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              />
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              />
              <button
                type="submit"
                disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword}
                className="px-4 py-2 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-200 border border-brand-500/30 transition-colors disabled:opacity-50"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-white/10">
            <button type="button"
              onClick={handleSignOut}
              className="px-6 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition-colors"
            >
              Sign Out
            </button>
            {onClose && (
              <button type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}