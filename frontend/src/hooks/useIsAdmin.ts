import { useEnhancedAuth } from '../contexts/EnhancedAuthContext'

export function useIsAdmin() {
  const { user, userProfile } = useEnhancedAuth()
  
  // For now, return false for admin status
  // This can be enhanced later with proper admin role checking
  const isAdmin = false
  const isLoading = false
  
  return { isAdmin, isLoading }
}
