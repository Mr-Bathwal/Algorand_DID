import React from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import AuthGuard from './AuthGuard'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  fallback 
}: ProtectedRouteProps) {
  const { user, loading } = useEnhancedAuth()

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
      <AuthGuard requireAuth={true}>
        {children}
      </AuthGuard>
    )
  }

  // If user is logged in or authentication is not required, show children
  return <>{children}</>
}