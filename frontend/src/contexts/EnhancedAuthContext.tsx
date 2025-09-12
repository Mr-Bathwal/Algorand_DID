import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithCredential,
  unlink,
  getIdToken
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { backendService, SessionInfo } from '../services/backendService'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  phoneNumber?: string | null
  walletAddress?: string
  algorandAddress?: string
  isVerified: boolean
  createdAt: string
  lastLoginAt: string
  preferences: {
    language: string
    notifications: boolean
    privacy: {
      shareData: boolean
      autoDelete: boolean
    }
  }
  verificationStatus: {
    faceVerified: boolean
    aadhaarVerified: boolean
    incomeVerified: boolean
    biometricVerified: boolean
  }
}

export interface AlgorandAccount {
  address: string
  encryptedPrivateKey: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  algorandAccount: AlgorandAccount | null
  sessionInfo: SessionInfo | null
  loading: boolean
  isBackendAuthenticated: boolean
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
  linkWallet: (walletAddress: string) => Promise<void>
  unlinkWallet: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  linkWithGoogle: () => Promise<void>
  unlinkGoogle: () => Promise<void>
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  submitTransaction: (method: string, params: any[]) => Promise<any>
  getVerificationStatus: () => Promise<any>
  submitVerification: (data: any) => Promise<any>
  getUserCertificates: () => Promise<any>
  getUserBadges: () => Promise<any>
  getTrustScore: () => Promise<any>
  sendOTP: (phoneNumber: string) => Promise<any>
  verifyOTP: (otp: string, confirmationResult: any) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [algorandAccount, setAlgorandAccount] = useState<AlgorandAccount | null>(null)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false)

  // Initialize backend session on mount
  useEffect(() => {
    const initializeBackendSession = async () => {
      try {
        if (backendService.initializeSession()) {
          const session = await backendService.getSessionInfo()
          if (session) {
            setSessionInfo(session)
            setIsBackendAuthenticated(true)
            
            // Load stored Algorand account
            const storedAccount = backendService.getStoredAlgorandAccount()
            if (storedAccount) {
              setAlgorandAccount(storedAccount)
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize backend session:', error)
      }
    }

    initializeBackendSession()
  }, [])

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        try {
          // Load user profile from Firestore
          const profileDoc = await getDoc(doc(db, 'users', user.uid))
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile)
          } else {
            // Create default profile for new users
            const defaultProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || undefined,
              ...(user.phoneNumber && { phoneNumber: user.phoneNumber }),
              isVerified: false,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              preferences: {
                language: 'en',
                notifications: true,
                privacy: {
                  shareData: false,
                  autoDelete: false
                }
              },
              verificationStatus: {
                faceVerified: false,
                aadhaarVerified: false,
                incomeVerified: false,
                biometricVerified: false
              }
            }
            await setDoc(doc(db, 'users', user.uid), defaultProfile)
            setUserProfile(defaultProfile)
          }

          // If backend is not authenticated, try to authenticate with Firebase ID token
          if (!isBackendAuthenticated) {
            await authenticateWithBackend(user)
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      } else {
        setUserProfile(null)
        setAlgorandAccount(null)
        setSessionInfo(null)
        setIsBackendAuthenticated(false)
        await backendService.logout()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isBackendAuthenticated])

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      setIsBackendAuthenticated(false)
      setSessionInfo(null)
      setAlgorandAccount(null)
      // Optionally redirect to login or show auth modal
    }

    window.addEventListener('session-expired', handleSessionExpired)
    return () => window.removeEventListener('session-expired', handleSessionExpired)
  }, [])

  const authenticateWithBackend = async (user: User) => {
    try {
      const idToken = await getIdToken(user)
      const authResponse = await backendService.verifyIdToken(idToken)
      
      setSessionInfo(authResponse)
      setAlgorandAccount(authResponse.algorandAccount)
      setIsBackendAuthenticated(true)
      
      // Create smart wallet first
      try {
        console.log('🔄 Creating smart wallet...')
        const walletResult = await backendService.createSmartWallet(1, 1, 1000000) // 1 guardian, threshold 1, 1 ALGO daily limit
        if (walletResult.success) {
          console.log('✅ Smart wallet created successfully')
          
          // Register user with smart contract
          try {
            console.log('🔄 Registering user with smart contract...')
            const phoneNumber = user.phoneNumber || ''
            const registerResult = await backendService.registerUser(user.email || '', phoneNumber)
            
            if (registerResult.success) {
              console.log('✅ User registered with smart contract successfully')
              
              // Initialize trust score for the user
              try {
                const trustScoreResult = await backendService.initializeTrustScore(authResponse.algorandAccount.address)
                if (trustScoreResult.success) {
                  console.log('✅ Trust score initialized successfully')
                }
              } catch (trustError) {
                console.warn('⚠️ Trust score initialization failed:', trustError)
                // Don't fail the entire flow for trust score issues
              }
            } else {
              console.warn('⚠️ User registration with smart contract failed:', registerResult.error)
            }
          } catch (registerError) {
            console.warn('⚠️ Smart contract registration failed:', registerError)
            // Don't fail the entire flow for registration issues
          }
        } else {
          console.warn('⚠️ Smart wallet creation failed:', walletResult.error)
        }
      } catch (walletError) {
        console.warn('⚠️ Smart wallet creation failed:', walletError)
        // Don't fail the entire flow for wallet creation issues
      }
      
      // Update user profile with Algorand address
      if (userProfile) {
        await updateDoc(doc(db, 'users', user.uid), {
          algorandAddress: authResponse.algorandAccount.address
        })
        setUserProfile(prev => prev ? { 
          ...prev, 
          algorandAddress: authResponse.algorandAccount.address 
        } : null)
      }
    } catch (error) {
      console.error('Failed to authenticate with backend:', error)
      // Continue with Firebase auth even if backend auth fails
    }
  }

  const signOutUser = async () => {
    try {
      console.log('🔄 Signing out user...')
      await backendService.logout()
      await signOut(auth)
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error('❌ Sign out error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await updateDoc(doc(db, 'users', user.uid), updates)
      setUserProfile(prev => prev ? { ...prev, ...updates } : null)
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  const linkWallet = async (walletAddress: string) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        walletAddress
      })
      setUserProfile(prev => prev ? { ...prev, walletAddress } : null)
    } catch (error) {
      console.error('Link wallet error:', error)
      throw error
    }
  }

  const unlinkWallet = async () => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        walletAddress: null
      })
      setUserProfile(prev => prev ? { ...prev, walletAddress: undefined } : null)
    } catch (error) {
      console.error('Unlink wallet error:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      // Use redirect instead of popup to avoid CSP issues
      const result = await signInWithPopup(auth, provider)
      console.log('✅ Google sign-in successful:', result.user.email)
      
      // Authenticate with backend
      await authenticateWithBackend(result.user)
      
      // Update last login time
      if (userProfile) {
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLoginAt: new Date().toISOString()
        })
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error)
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.')
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection and try again.')
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.')
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email. Please use a different sign-in method.')
      } else if (error.code === 'auth/internal-error') {
        throw new Error('Firebase configuration error. Please contact support.')
      } else {
        throw new Error(`Sign-in failed: ${error.message}`)
      }
    }
  }

  const linkWithGoogle = async () => {
    if (!user) throw new Error('No user logged in')
    
    try {
      const provider = new GoogleAuthProvider()
      const credential = await linkWithCredential(user, provider.credential)
      console.log('Google account linked successfully')
    } catch (error) {
      console.error('Link Google error:', error)
      throw error
    }
  }

  const unlinkGoogle = async () => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await unlink(user, GoogleAuthProvider.PROVIDER_ID)
      console.log('Google account unlinked successfully')
    } catch (error) {
      console.error('Unlink Google error:', error)
      throw error
    }
  }

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in')
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      
      // Update password
      await updatePassword(user, newPassword)
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('No user logged in')
    
    try {
      await sendPasswordResetEmail(auth, user.email!)
      console.log('Verification email sent successfully')
    } catch (error) {
      console.error('Send verification email error:', error)
      throw error
    }
  }

  // Backend service methods
  const submitTransaction = async (method: string, params: any[]) => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.submitTransaction({
      method,
      params,
      sessionToken: sessionInfo?.sessionToken || ''
    })
  }

  const getVerificationStatus = async () => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.getVerificationStatus()
  }

  const submitVerification = async (data: any) => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.submitVerification(data)
  }

  const getUserCertificates = async () => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.getUserCertificates()
  }

  const getUserBadges = async () => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.getUserBadges()
  }

  const getTrustScore = async () => {
    if (!isBackendAuthenticated) {
      throw new Error('Not authenticated with backend')
    }
    
    return await backendService.getTrustScore()
  }

  const sendOTP = async (phoneNumber: string) => {
    // For now, return a mock OTP verification
    // This should be implemented with your actual OTP service
    console.log('Mock OTP sent to:', phoneNumber)
    return { success: true }
  }

  const verifyOTP = async (otp: string, confirmationResult: any) => {
    // For now, return a mock verification
    // This should be implemented with your actual OTP service
    console.log('Mock OTP verification:', otp)
    return { success: true, user: null }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    algorandAccount,
    sessionInfo,
    loading,
    isBackendAuthenticated,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile,
    linkWallet,
    unlinkWallet,
    signInWithGoogle,
    linkWithGoogle,
    unlinkGoogle,
    updateUserPassword,
    sendVerificationEmail,
    submitTransaction,
    getVerificationStatus,
    submitVerification,
    getUserCertificates,
    getUserBadges,
    getTrustScore,
    sendOTP,
    verifyOTP
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useEnhancedAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider')
  }
  return context
}
