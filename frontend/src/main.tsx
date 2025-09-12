import React from 'react'
import ReactDOM from 'react-dom/client'
// import { createBrowserRouter, RouterProvider } from 'react-router-dom' // Moved to App.tsx
import './index.css'
import App from './App'

// Polyfill Buffer for browser - comprehensive solution
import { Buffer } from "buffer"

// Set Buffer globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

// Set global and Buffer globally in all possible contexts
const setGlobalAndBuffer = (buffer: any) => {
  // Define global first
  if (typeof global === 'undefined') {
    (globalThis as any).global = globalThis
    if (typeof window !== 'undefined') {
      (window as any).global = globalThis
    }
  }
  
  // Set Buffer in all contexts
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).Buffer = buffer
  }
  if (typeof window !== 'undefined') {
    (window as any).Buffer = buffer
  }
  if (typeof global !== 'undefined') {
    (global as any).Buffer = buffer
  }
  if (typeof self !== 'undefined') {
    (self as any).Buffer = buffer
  }
}

// Set global and Buffer immediately
setGlobalAndBuffer(Buffer)

// Also set it on the global object
;(window as any).Buffer = Buffer
;(globalThis as any).Buffer = Buffer

// Algorand-only wallet integration

// Algorand-only wallet support
if (typeof window !== 'undefined') {
  console.log('Algorand wallet support initialized');
}

// Clear any cached wallet connections (Algorand only)
localStorage.removeItem("algo_connected_wallet");
// All route imports moved to App.tsx

// Router moved to App.tsx

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

