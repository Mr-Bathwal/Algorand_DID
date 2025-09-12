import React from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import AuthModal from './AuthModal'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

export default function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = true 
}: AuthGuardProps) {
  const { user, loading } = useEnhancedAuth()
  const [showAuthModal, setShowAuthModal] = React.useState(false)

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center animate-pulse">
            <img src="/images/ashoka.svg" alt="Ashoka" className="h-6 w-6" />
          </div>
          <div className="text-white/70">Loading...</div>
        </div>
      </div>
    )
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
              <img src="/images/ashoka.svg" alt="Ashoka" className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-white/70 mb-8">
              Please sign in to access your digital identity services and verification status.
            </p>
            <button type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-brand-600 to-indiaGreen text-white font-semibold hover:from-brand-700 hover:to-indiaGreen/90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    )
  }

  // If user is logged in or authentication is not required, show children
  return <>{children}</>
}
