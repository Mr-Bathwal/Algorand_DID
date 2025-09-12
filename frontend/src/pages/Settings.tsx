import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function Settings() {
  const { t } = useLanguage()
  
  // User preferences state
  const [userPrefs, setUserPrefs] = useState({
    enableNotifications: true,
    darkMode: true,
    language: 'en',
    autoConnect: false
  })

  const handleSave = () => {
    // Save user preferences to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(userPrefs))
    alert('Settings saved!')
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-lg border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        
        {/* User Preferences */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">User Preferences</h2>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={userPrefs.enableNotifications}
              onChange={(e) => setUserPrefs(prev => ({ ...prev, enableNotifications: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
            />
            <span className="text-white">Enable Notifications</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={userPrefs.darkMode}
              onChange={(e) => setUserPrefs(prev => ({ ...prev, darkMode: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
            />
            <span className="text-white">Dark Mode</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={userPrefs.autoConnect}
              onChange={(e) => setUserPrefs(prev => ({ ...prev, autoConnect: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500"
            />
            <span className="text-white">Auto-connect Wallet</span>
          </label>
        </div>

        {/* Algorand Settings */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">Algorand Settings</h2>
          
          <div className="text-sm text-white/70">
            <p>Network: Algorand Testnet</p>
            <p>Wallet: Algorand-only (Pera & Defly)</p>
            <p>Smart Contracts: Algorand-based</p>
          </div>
        </div>

        {/* Help */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">Help</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-white/70">
            <li>This application uses Algorand blockchain for all operations.</li>
            <li>Connect your Pera or Defly wallet to interact with smart contracts.</li>
            <li>All verification data is stored on Algorand testnet.</li>
            <li>For support, contact the development team.</li>
          </ul>
        </div>

        <div className="mt-8">
          <button type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}