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
  unlink
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  phoneNumber?: string | null  // Allow null values
  walletAddress?: string
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

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        // Load user profile from Firestore
        try {
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
              // Remove phoneNumber if undefined to avoid Firestore error
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
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOutUser = async () => {
    try {
      console.log('🔄 Signing out user...')
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
      
      const result = await signInWithPopup(auth, provider)
      console.log('✅ Google sign-in successful:', result.user.email)
      
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

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signOut: signOutUser,
    resetPassword,
    updateUserProfile,
    linkWallet,
    unlinkWallet,
    signInWithGoogle,
    linkWithGoogle,
    unlinkGoogle,
    updateUserPassword,
    sendVerificationEmail
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}