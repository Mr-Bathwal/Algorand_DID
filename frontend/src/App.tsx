import { Outlet, Link, useLocation, BrowserRouter, Routes, Route } from 'react-router-dom'
import AlgorandWalletButton from './components/AlgorandWalletButton'
import GovTopBar from './components/GovTopBar'
import MyGovNav from './components/MyGovNav'
import ChatBot from './components/ChatBot'
import { LanguageProvider, useLanguage, languageOptions } from './contexts/LanguageContext'
import { EnhancedAuthProvider, useEnhancedAuth } from './contexts/EnhancedAuthContext'
import { AlgorandProvider } from './algorand/AlgorandProvider'
import AuthModal from './components/auth/AuthModal'
import UserProfile from './components/auth/UserProfile'
import { useState, useEffect } from 'react'
import { User, LogIn, UserCircle, X } from 'lucide-react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Wizard from './pages/Wizard'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import Organizations from './pages/admin/Organizations'
import Certificates from './pages/admin/Certificates'
import Recognitions from './pages/admin/Recognitions'
import CrossChain from './pages/admin/CrossChain'
import Logs from './pages/admin/Logs'
import AlgorandVerificationPage from './pages/AlgorandVerificationPage'
import FaceVerificationPage from './pages/FaceVerificationPage'
import ComprehensiveVerificationPage from './pages/ComprehensiveVerificationPage'
import CompleteDashboard from './pages/CompleteDashboard'
import GoogleCallback from './components/auth/GoogleCallback'
import PollSurvey from './pages/PollSurvey'
import VoiceDemo from './pages/VoiceDemo'

function AppContent() {
  // Now we can safely use hooks since we're inside Router context
  const { pathname } = useLocation()
  const { t } = useLanguage()
  const { user, userProfile, algorandAccount, isBackendAuthenticated } = useEnhancedAuth()
  
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  
  // Close profile modal when user signs out
  useEffect(() => {
    if (!user) {
      setShowProfile(false)
    }
  }, [user])
  
  const tabs = [
    { to: '/', label: t('home') },
    { to: '/status', label: t('myStatus') },
    { to: '/complete-dashboard', label: 'Complete Dashboard' },
    { to: '/wizard', label: t('verification') },
    { to: '/algorand', label: 'Algorand' },
    { to: '/admin', label: t('adminServices') },
    { to: '/settings', label: t('settings') },
  ]
  return (
    <div className="min-h-screen crystal-bg text-slate-100">
      <GovTopBar />
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur glass">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-600 to-indiaGreen grid place-items-center">
              <img src="/images/ashoka.svg" alt="Ashoka" className="h-6 w-6" />
            </div>
            <div className="font-semibold">
              {t('digitalIdentityServices')}
              <div className="text-xs text-white/60">{t('governmentOfIndia')}</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(t => (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-1.5 rounded-md hover:bg-white/10 ${pathname === t.to ? 'bg-white/10' : ''}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
                      <div className="flex items-center gap-3">
                        <LanguageDropdown />
                        <span className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/20 text-slate-200">
              {t('network')}: Algorand Testnet
              {isBackendAuthenticated && algorandAccount && (
                <span className="ml-2 text-green-400">● Connected</span>
              )}
            </span>
                        <AlgorandWalletButton />
            
            {/* Auth Button */}
            {user ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-sm transition-colors"
              >
                <UserCircle className="h-4 w-4" />
                <span>
                  {userProfile?.displayName || user.email?.split('@')[0]}
                  {algorandAccount && (
                    <span className="ml-1 text-xs text-green-400">
                      ({algorandAccount.address.slice(0, 6)}...{algorandAccount.address.slice(-4)})
                    </span>
                  )}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
      <MyGovNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-white/50">
        {t('footerText')}
      </footer>
      <ChatBot />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
      
      {/* User Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
            <UserProfile />
          </div>
        </div>
      )}
    </div>
  )
}

function LanguageDropdown() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = languageOptions.find(lang => lang.code === language)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-sm transition-colors"
      >
        <span className="text-xs">🌐</span>
        <span>{currentLanguage?.nativeName}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/20 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                language === lang.code ? 'bg-white/20 text-brand-400' : 'text-white/90'
              }`}
            >
              <div className="font-medium">{lang.nativeName}</div>
              <div className="text-xs text-white/60">{lang.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <EnhancedAuthProvider>
        <AlgorandProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppContent />}>
                <Route index element={<Home />} />
                <Route path="status" element={<Dashboard />} />
                <Route path="wizard" element={<Wizard />} />
                <Route path="admin" element={<Admin />} />
                <Route path="admin/organizations" element={<Organizations />} />
                <Route path="admin/certificates" element={<Certificates />} />
                <Route path="admin/recognitions" element={<Recognitions />} />
                <Route path="admin/cross-chain" element={<CrossChain />} />
                <Route path="admin/logs" element={<Logs />} />
                <Route path="settings" element={<Settings />} />
                            <Route path="algorand" element={<AlgorandVerificationPage />} />
                            <Route path="face-verification" element={<FaceVerificationPage />} />
                            <Route path="comprehensive-verification" element={<ComprehensiveVerificationPage />} />
                            <Route path="complete-dashboard" element={<CompleteDashboard />} />
                            <Route path="auth/callback" element={<GoogleCallback />} />
                <Route path="poll-survey" element={<PollSurvey />} />
                <Route path="voice-demo" element={<VoiceDemo />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AlgorandProvider>
      </EnhancedAuthProvider>
    </LanguageProvider>
  )
}

