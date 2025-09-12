import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtuoKjWBLf-1rg2v9sBwET32LTwUPUDa0",
  authDomain: "identity-dapp.firebaseapp.com",
  projectId: "identity-dapp",
  storageBucket: "identity-dapp.firebasestorage.app",
  messagingSenderId: "3996124759",
  appId: "1:3996124759:web:eebb050345d9767b1ac512",
  measurementId: "G-GWQYKS8XDV"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Connect to emulators in development (DISABLED for production Firebase)
// if (import.meta.env.DEV) {
//   try {
//     // Only connect if not already connected
//     if (!auth.config.emulator) {
//       connectAuthEmulator(auth, 'http://localhost:9099')
//     }
//     if (!db._delegate._settings?.host?.includes('localhost')) {
//       connectFirestoreEmulator(db, 'localhost', 8080)
//     }
//     if (!storage._delegate._host?.includes('localhost')) {
//       connectStorageEmulator(storage, 'localhost', 9199)
//     }
//   } catch (error) {
//     console.warn('Firebase emulators not available:', error)
//   }
// }

export default app