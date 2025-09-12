import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { backendService } from '../../services/backendService'
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const { user } = useEnhancedAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Authentication failed: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received')
          return
        }

        // Exchange code for session token
        const authResponse = await backendService.exchangeGoogleCode(code)
        
        setStatus('success')
        setMessage('Successfully authenticated with backend!')
        
        // Redirect to home page after successful authentication
        setTimeout(() => {
          navigate('/')
        }, 2000)

      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Authentication failed')
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-400 animate-spin mx-auto mb-4" />
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
      case 'error':
        return <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-200'
      case 'success':
        return 'text-green-200'
      case 'error':
        return 'text-red-200'
    }
  }

  return (
    <div className="min-h-screen crystal-bg text-slate-100 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
          {getStatusIcon()}
          
          <h2 className="text-2xl font-bold text-white mb-4">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Authentication Successful!'}
            {status === 'error' && 'Authentication Failed'}
          </h2>
          
          <p className={`mb-6 ${getStatusColor()}`}>
            {status === 'loading' && 'Please wait while we set up your account...'}
            {status === 'success' && message}
            {status === 'error' && message}
          </p>

          {status === 'error' && (
            <div className="space-y-4">
              <button type="button"
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Return to Home
              </button>
              <button type="button"
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-sm text-white/70">
              Redirecting to home page...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
