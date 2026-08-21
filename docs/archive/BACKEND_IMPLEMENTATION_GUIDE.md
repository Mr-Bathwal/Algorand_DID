# Python Backend Implementation Guide

## Required Backend API Endpoints

Your Python backend needs to implement these endpoints to work with the frontend:

### Authentication Endpoints

#### `POST /auth/google`
Exchange Google OAuth code for session token
```python
@app.post("/auth/google")
async def exchange_google_code(request: GoogleAuthRequest):
    # 1. Exchange code for Google ID token
    # 2. Verify the ID token
    # 3. Extract user info (email, name, etc.)
    # 4. Check if Algorand keypair exists for this user
    # 5. If not, generate new keypair and encrypt private key
    # 6. Create session token
    # 7. Return session token + user info + Algorand address
    
    return {
        "sessionToken": "your-session-token",
        "user": {
            "id": "google-user-id",
            "email": "user@example.com",
            "name": "User Name",
            "picture": "https://..."
        },
        "algorandAccount": {
            "address": "ALGORAND_ADDRESS",
            "encryptedPrivateKey": "encrypted_private_key"
        }
    }
```

#### `POST /auth/verify-token`
Verify Firebase ID token
```python
@app.post("/auth/verify-token")
async def verify_id_token(request: TokenVerifyRequest):
    # 1. Verify Firebase ID token
    # 2. Extract user info
    # 3. Get/create Algorand keypair
    # 4. Return session info
    pass
```

#### `GET /auth/session`
Get current session info
```python
@app.get("/auth/session")
async def get_session_info(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Return user and Algorand account info
    pass
```

#### `POST /auth/logout`
Logout and clear session
```python
@app.post("/auth/logout")
async def logout(session_token: str = Header(...)):
    # 1. Invalidate session token
    # 2. Clear session data
    pass
```

### Blockchain Endpoints

#### `POST /blockchain/execute`
Execute smart contract transaction
```python
@app.post("/blockchain/execute")
async def execute_transaction(request: TransactionRequest, session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Get user's encrypted private key
    # 3. Decrypt private key
    # 4. Build Algorand transaction using the SDK functions
    # 5. Sign transaction with private key
    # 6. Submit to Algorand network
    # 7. Return transaction result
    pass
```

#### `GET /blockchain/account`
Get Algorand account info
```python
@app.get("/blockchain/account")
async def get_account_info(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Get Algorand address
    # 3. Query account info from Algorand
    # 4. Return balance and account details
    pass
```

### Verification Endpoints

#### `GET /verification/status`
Get user verification status
```python
@app.get("/verification/status")
async def get_verification_status(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Query smart contracts for user's verification status
    # 3. Return verification data
    pass
```

#### `POST /verification/submit`
Submit verification data
```python
@app.post("/verification/submit")
async def submit_verification(request: VerificationRequest, session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Process verification data
    # 3. Submit to smart contracts
    # 4. Return result
    pass
```

### User Data Endpoints

#### `GET /certificates/user`
Get user certificates
```python
@app.get("/certificates/user")
async def get_user_certificates(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Query certificate smart contract
    # 3. Return user's certificates
    pass
```

#### `GET /badges/user`
Get user badges
```python
@app.get("/badges/user")
async def get_user_badges(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Query badge smart contract
    # 3. Return user's badges
    pass
```

#### `GET /trust-score`
Get user trust score
```python
@app.get("/trust-score")
async def get_trust_score(session_token: str = Header(...)):
    # 1. Verify session token
    # 2. Query trust score smart contract
    # 3. Return trust score data
    pass
```

## Required Python Libraries

```bash
pip install fastapi uvicorn python-algorand-sdk cryptography firebase-admin google-auth google-auth-oauthlib
```

## Key Implementation Notes

1. **Algorand SDK**: Use `algosdk` to interact with Algorand blockchain
2. **Key Management**: Encrypt/decrypt private keys securely
3. **Session Management**: Implement secure session tokens
4. **Google Auth**: Use `google-auth` library to verify tokens
5. **Error Handling**: Proper error responses for frontend
6. **CORS**: Enable CORS for frontend communication

## Sample FastAPI Structure

```python
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import algosdk
from cryptography.fernet import Fernet
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your implementation here...
```

## Testing Your Backend

Once implemented, test with:
1. Start backend: `uvicorn main:app --reload --port 8000`
2. Start frontend: `npm run dev`
3. Test Google OAuth flow
4. Use integration tests in frontend
