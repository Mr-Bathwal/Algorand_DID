# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the Identity DApp.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `identity-dapp` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click and enable
   - **Google**: Click and enable, configure OAuth consent screen

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select Web (</>) icon
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 4. Set Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Algorand Configuration (existing)
VITE_ALGO_NETWORK=testnet
VITE_ALGOD_MAINNET_URL=https://mainnet-api.algonode.cloud
VITE_ALGOD_TESTNET_URL=https://testnet-api.algonode.cloud
VITE_ALGOD_BETANET_URL=https://betanet-api.algonode.cloud
VITE_ALGOD_TOKEN=
```

## 5. Set Up Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## 6. Set Up Firestore Security Rules

In the Firestore Database section, go to "Rules" tab and replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for verification status (if needed)
    match /verification_status/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to your app
3. Click "Sign In" button
4. Try creating a new account with email/password
5. Try signing in with Google (if enabled)

## 8. Production Considerations

For production deployment:

1. **Security Rules**: Update Firestore rules to be more restrictive
2. **Authentication**: Configure authorized domains in Firebase Auth settings
3. **Environment Variables**: Set up environment variables in your hosting platform
4. **Monitoring**: Enable Firebase Analytics and Performance Monitoring

## Features Included

The Firebase authentication system includes:

- ✅ Email/Password authentication
- ✅ Google OAuth authentication
- ✅ Password reset functionality
- ✅ User profile management
- ✅ Wallet linking (for blockchain integration)
- ✅ Multi-language support
- ✅ Protected routes
- ✅ Real-time authentication state
- ✅ User preferences and settings

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/configuration-not-found)"**
   - Check that all environment variables are set correctly
   - Ensure the Firebase project is properly configured

2. **"Firebase: Error (auth/invalid-api-key)"**
   - Verify the API key in your environment variables
   - Check that the API key is enabled in Firebase Console

3. **"Firebase: Error (auth/domain-not-authorized)"**
   - Add your domain to authorized domains in Firebase Auth settings

4. **Firestore permission denied**
   - Check your Firestore security rules
   - Ensure the user is authenticated before accessing Firestore

### Development vs Production:

- **Development**: Uses Firebase emulators (if available)
- **Production**: Uses live Firebase services
- **Environment Variables**: Use `.env.local` for local development, set in hosting platform for production