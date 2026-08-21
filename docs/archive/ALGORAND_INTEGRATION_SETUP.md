# Algorand Integration Setup Guide

## Overview

This project has been updated to integrate with a Python-based smart contract backend using Algorand blockchain. The new architecture follows this flow:

1. **Frontend "Sign in with Google"** → Google OAuth Consent → Redirect with code
2. **Backend exchanges code** → Verifies ID token → Extracts Google user ID
3. **Backend checks/creates Algorand keypair** → Stores mapping (Google ID → address + encrypted key)
4. **Frontend receives session token**
5. **User triggers on-chain action** → Frontend sends request + session token
6. **Backend verifies session** → Decrypts key → Signs transaction → Submits to Algorand
7. **Smart wallet contract handles user's abstracted account logic**

## New Components Added

### 1. Smart Contract SDK (`src/lib/contractsSdk.ts`)
- Complete Algorand smart contract integration
- All contract addresses and app IDs configured
- Functions for all modules: Organization, UserIdentity, TrustScore, Certificates, Badges, SmartWallet, Governance, Disputes

### 2. Backend Service (`src/services/backendService.ts`)
- Handles session-based authentication
- Manages Google OAuth code exchange
- Provides transaction submission interface
- Manages Algorand account information

### 3. Enhanced Authentication (`src/contexts/EnhancedAuthContext.tsx`)
- Integrates Firebase auth with backend session management
- Manages Algorand account information
- Provides smart contract interaction methods

### 4. Algorand Wallet Service (`src/services/algorandWalletService.ts`)
- Direct smart contract interaction
- Wallet management functions
- Transaction building and submission

### 5. Algorand Verification Component (`src/components/verification/AlgorandVerification.tsx`)
- Complete UI for Algorand verification management
- User registration on blockchain
- Trust score initialization
- Certificate and badge management

## Environment Variables Required

Create a `.env` file in your project root with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Backend Configuration
VITE_BACKEND_URL=http://localhost:8000
VITE_BACKEND_API_KEY=your-backend-api-key

# Algorand Configuration
VITE_ALGO_NETWORK=testnet
VITE_ALGOD_MAINNET_URL=https://mainnet-api.algonode.cloud
VITE_ALGOD_TESTNET_URL=https://testnet-api.algonode.cloud
VITE_ALGOD_BETANET_URL=https://betanet-api.algonode.cloud
VITE_ALGOD_TOKEN=

# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Pinata Configuration
VITE_PINATA_JWT=your-pinata-jwt
VITE_PINATA_API_KEY=your-pinata-api-key
VITE_PINATA_API_SECRET=your-pinata-api-secret
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

## Smart Contract Addresses

The following Algorand application IDs are configured:

```typescript
export const Contracts: ContractsConfig = {
  organization_registry: { app_id: 745680367 },
  user_identity: { app_id: 745680430 },
  trust_score: { app_id: 745680432 },
  certificate_management: { app_id: 745680498 },
  badge_system: { app_id: 745680508 },
  smart_wallet: { app_id: 745680538 },
  governance: { app_id: 745680789 },
  dispute_resolution: { app_id: 745680790 },
};
```

## Backend API Endpoints Expected

Your Python backend should implement these endpoints:

### Authentication
- `POST /auth/google` - Exchange Google OAuth code for session
- `POST /auth/verify-token` - Verify Firebase ID token
- `GET /auth/session` - Get current session info
- `POST /auth/logout` - Logout and clear session

### Blockchain Operations
- `POST /blockchain/execute` - Execute smart contract transaction
- `GET /blockchain/account` - Get Algorand account info

### Verification
- `GET /verification/status` - Get user verification status
- `POST /verification/submit` - Submit verification data

### User Data
- `GET /certificates/user` - Get user certificates
- `GET /badges/user` - Get user badges
- `GET /trust-score` - Get user trust score

## New Navigation

The app now includes an "Algorand" tab in the navigation that leads to the new verification interface.

## Key Features

### 1. Session-Based Authentication
- Google OAuth integration with backend
- Automatic Algorand keypair creation/retrieval
- Secure session token management

### 2. Smart Wallet Integration
- Guardian-protected wallets
- Recovery mechanisms
- Daily spending limits
- Multi-signature support

### 3. Identity Management
- User registration on blockchain
- Verification system integration
- Trust score calculation
- Certificate and badge issuance

### 4. Transaction Management
- Backend-signed transactions
- No private key exposure to frontend
- Secure transaction submission
- Real-time status updates

## Usage Flow

1. User clicks "Sign In" → Google OAuth popup
2. User authorizes → Redirect to `/auth/callback` with code
3. Backend exchanges code → Creates/retrieves Algorand account
4. Frontend receives session token → User is authenticated
5. User navigates to Algorand tab → Can interact with smart contracts
6. All transactions are signed by backend using encrypted private keys

## Security Features

- No private keys stored in frontend
- Session-based authentication
- Encrypted key storage on backend
- Guardian protection for smart wallets
- Multi-layer verification system

## Testing

1. Set up your Python backend with the required endpoints
2. Configure environment variables
3. Start the backend server
4. Run the frontend: `npm run dev`
5. Test the Google OAuth flow
6. Navigate to Algorand tab to test smart contract interactions

## Migration Notes

- The old Ethereum-based components are still present but not actively used
- The new system uses Algorand smart contracts instead of Ethereum
- All verification data is now stored on Algorand blockchain
- Backend handles all private key operations for security
