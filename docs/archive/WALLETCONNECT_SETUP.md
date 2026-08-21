# WalletConnect Setup Guide

## 🔗 **Get WalletConnect Project ID**

1. **Go to WalletConnect Cloud**: Visit [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/)
2. **Sign up/Login**: Create an account or login
3. **Create New Project**:
   - Click "Create Project"
   - Enter project name: `identity-dapp`
   - Enter project description: `Digital Identity DApp`
   - Click "Create"
4. **Get Project ID**:
   - Copy the Project ID from your project dashboard
   - It will look like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## 📝 **Add to Environment Variables**

Add this line to your `.env.local` file:

```env
# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your-actual-project-id-here
```

## 🔧 **Complete .env.local Example**

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDtuoKjWBLf-1rg2v9sBwET32LTwUPUDa0
VITE_FIREBASE_AUTH_DOMAIN=identity-dapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=identity-dapp
VITE_FIREBASE_STORAGE_BUCKET=identity-dapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=3996124759
VITE_FIREBASE_APP_ID=1:3996124759:web:eebb050345d9767b1ac512

# Algorand Configuration (existing)
VITE_ALGO_NETWORK=testnet
VITE_ALGOD_MAINNET_URL=https://mainnet-api.algonode.cloud
VITE_ALGOD_TESTNET_URL=https://testnet-api.algonode.cloud
VITE_ALGOD_BETANET_URL=https://betanet-api.algonode.cloud
VITE_ALGOD_TOKEN=

# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your-actual-project-id-here

# Development
NODE_ENV=development
```

## 🚀 **Test the Fix**

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Open your app**: Go to `http://localhost:5175/`

3. **Test wallet connection**:
   - Click "Connect Wallet" button
   - You should see both Ethereum and Algorand wallet options
   - The `WagmiProviderNotFoundError` should be resolved

## 🎯 **What's Fixed**

- ✅ **WagmiProvider added** to the provider chain
- ✅ **QueryClientProvider added** for React Query
- ✅ **Hybrid wallet support** (Ethereum + Algorand)
- ✅ **useIsAdmin hook** now works properly
- ✅ **AdminCard component** should render without errors

## 🐛 **If You Still See Errors**

1. **Clear browser cache** and refresh
2. **Check console** for any remaining errors
3. **Verify environment variables** are loaded correctly
4. **Restart development server** after adding WalletConnect project ID

The app should now load without the `WagmiProviderNotFoundError`! 🎉
