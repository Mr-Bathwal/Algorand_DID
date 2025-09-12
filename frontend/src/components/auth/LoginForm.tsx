import React, { useState } from 'react';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';

interface LoginFormProps {
  onSwitchToSignUp: () => void;
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignUp, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const { signInWithGoogle, user, sendVerificationEmail } = useEnhancedAuth();

  const handleGoogleSignIn = async () => {
    setError('');
    setResetMessage('');

    try {
      setLoading(true);
      await signInWithGoogle();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      setResetMessage('Verification email sent! Check your inbox.');
    } catch (error: any) {
      setError(error.message || 'Failed to send verification email');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass p-8 rounded-xl border border-white/10">
        <div className="text-center mb-6">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
            <img src="/images/ashoka.svg" alt="Ashoka" className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
          <p className="text-white/70">Access your digital identity account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        {resetMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
            {resetMessage}
          </div>
        )}

        {user && !user.emailVerified && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-sm">
            <p className="text-sm">Please verify your email address to continue.</p>
            <button type="button"
              onClick={handleResendVerification}
              className="text-sm underline hover:no-underline mt-1"
            >
              Resend verification email
            </button>
          </div>
        )}

        {/* Google Sign In Only */}
        <button type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing In...' : 'Continue with Google'}
        </button>

        <div className="mt-6 text-center">
          <div className="text-sm text-white/70">
            Don't have an account?{' '}
            <button type="button"
              onClick={onSwitchToSignUp}
              className="text-brand-400 hover:text-brand-300 underline"
            >
              Create one here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;