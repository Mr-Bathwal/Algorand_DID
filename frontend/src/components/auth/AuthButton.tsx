import React, { useState } from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import AuthModal from './AuthModal'
import UserProfile from './UserProfile'

export default function AuthButton() {
  const { user, userProfile, signOut } = useEnhancedAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (user && userProfile) {
    return (
      <>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => setShowUserProfile(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            title={`${userProfile.displayName} (${userProfile.email})`}
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <img src="/images/ashoka.svg" alt="Profile" className="h-3 w-3" />
              )}
            </div>
            <span className="text-sm font-medium">
              {userProfile.displayName.split(' ')[0]}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button type="button"
            onClick={handleSignOut}
            className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm transition-colors"
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>

        {showUserProfile && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowUserProfile(false)}
              />
              <div className="relative w-full max-w-4xl">
                <button type="button"
                  onClick={() => setShowUserProfile(false)}
                  className="absolute -top-4 -right-4 z-10 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <UserProfile onClose={() => setShowUserProfile(false)} />
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button type="button"
        onClick={() => setShowAuthModal(true)}
        className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
      >
        Sign In
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}
