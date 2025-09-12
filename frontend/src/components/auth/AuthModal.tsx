import React, { useState } from 'react'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'

type AuthMode = 'login' | 'signup'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: AuthMode
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { user } = useEnhancedAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Close modal if user is authenticated
  React.useEffect(() => {
    if (user && isOpen) {
      onClose()
    }
  }, [user, isOpen, onClose])

  if (!isOpen) return null

  const handleSuccess = () => {
    onClose()
  }

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToSignUp={() => setMode('signup')}
          />
        )
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-4 -right-4 z-10 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {renderForm()}
        </div>
      </div>
    </div>
  )
}