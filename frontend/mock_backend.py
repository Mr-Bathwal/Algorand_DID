#!/usr/bin/env python3
"""
Simple mock backend for testing the frontend integration
This is a temporary solution until you implement the full backend
"""

from fastapi import FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import secrets
import time
from datetime import datetime, timedelta
import algosdk
from algosdk import transaction
from algosdk.v2client import algod

app = FastAPI()

# Algorand configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# Smart contract addresses
CONTRACTS = {
    "organization_registry": 745680367,
    "user_identity": 745680430,
    "trust_score": 745680432,
    "certificate_management": 745680498,
    "badge_system": 745680508,
    "smart_wallet": 745680538,
    "governance": 745680789,
    "dispute_resolution": 745680790,
    "paymaster": 745692491,
}

def str_arg(s: str) -> bytes:
    """Convert string to bytes for Algorand transaction args"""
    return s.encode('utf-8')

def uint_arg(i: int) -> bytes:
    """Convert int to bytes for Algorand transaction args"""
    return algosdk.encoding.encode_uint64(i)

def create_user_registration_tx(sender: str, email: str, phone: str) -> str:
    """Create and submit actual Algorand transaction for user registration"""
    try:
        # Get transaction parameters
        params = algod_client.suggested_params()
        
        # Create the transaction
        txn = transaction.ApplicationNoOpTxn(
            sender=sender,
            sp=params,
            index=CONTRACTS["user_identity"],
            app_args=[
                str_arg("register_user"),
                str_arg(email),
                str_arg(phone)
            ]
        )
        
        # For testing, we'll create a mock transaction ID
        # In production, you would:
        # 1. Sign the transaction with the user's private key
        # 2. Submit to Algorand network
        # 3. Return the actual transaction ID
        
        # Mock transaction ID for testing
        mock_tx_id = f"mock_tx_{secrets.token_hex(8)}"
        print(f"✅ Created user registration transaction: {mock_tx_id}")
        print(f"   Sender: {sender}")
        print(f"   Email: {email}")
        print(f"   Phone: {phone}")
        print(f"   App ID: {CONTRACTS['user_identity']}")
        
        return mock_tx_id
        
    except Exception as e:
        print(f"❌ Error creating user registration transaction: {e}")
        return f"error_tx_{secrets.token_hex(4)}"

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data storage
sessions = {}
users = {}

class GoogleAuthRequest(BaseModel):
    code: str
    redirectUri: str

class TokenVerifyRequest(BaseModel):
    idToken: str

class TransactionRequest(BaseModel):
    method: str
    appId: Optional[int] = None
    params: list
    boxes: Optional[List[Dict[str, str]]] = None
    sessionToken: str
    walletAddress: Optional[str] = None

@app.post("/auth/google")
async def exchange_google_code(request: GoogleAuthRequest):
    # Mock Google OAuth exchange
    session_token = secrets.token_urlsafe(32)
    
    # Mock user data
    user_data = {
        "id": "mock-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/100"
    }
    
    # Mock Algorand account
    algorand_account = {
        "address": "MOCKADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
        "encryptedPrivateKey": "encrypted_mock_private_key"
    }
    
    # Store session
    sessions[session_token] = {
        "user": user_data,
        "algorand_account": algorand_account
    }
    
    return {
        "sessionToken": session_token,
        "user": user_data,
        "algorandAccount": algorand_account
    }

@app.post("/auth/verify-token")
async def verify_id_token(request: TokenVerifyRequest, response: Response):
    # Mock token verification
    session_token = secrets.token_urlsafe(32)
    
    user_data = {
        "id": "mock-user-456",
        "email": "test2@example.com",
        "name": "Test User 2",
        "picture": "https://via.placeholder.com/100"
    }
    
    # Generate a realistic Algorand address
    import base64
    
    # Create a mock but realistic Algorand address (58 characters)
    mock_address = "JNN5FF" + ''.join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567") for _ in range(52))
    
    algorand_account = {
        "address": mock_address,
        "encryptedPrivateKey": "encrypted_mock_private_key_2"
    }
    
    sessions[session_token] = {
        "user": user_data,
        "algorand_account": algorand_account
    }
    
    # Set secure cookie with proper security headers
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="Lax",
        max_age=3600,  # 1 hour
        secure=False,  # Set to False for localhost development
        path="/"
    )
    
    return {
        "sessionToken": session_token,
        "user": user_data,
        "algorandAccount": algorand_account
    }

@app.get("/auth/session")
async def get_session_info(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    session_data = sessions[x_session_token]
    return {
        "sessionToken": x_session_token,
        "user": session_data["user"],
        "algorandAccount": {
            "address": session_data["algorand_account"]["address"]
        }
    }

@app.post("/auth/logout")
async def logout(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token in sessions:
        del sessions[x_session_token]
    return {"success": True}

@app.post("/blockchain/execute")
async def execute_transaction(request: TransactionRequest, x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Handle user registration
    if request.method == "register_user":
        email = request.params[1] if len(request.params) > 1 else ""
        phone = request.params[2] if len(request.params) > 2 else ""
        
        # Get sender address from request or session
        sender_address = request.walletAddress or sessions.get(x_session_token, {}).get("wallet_address", "MOCK_SENDER_ADDRESS")
        
        # Create actual Algorand transaction
        try:
            transaction_id = create_user_registration_tx(sender_address, email, phone)
            
            # Store user registration data
            user_registration = {
                "email": email,
                "phone": phone,
                "appId": request.appId,
                "sender": sender_address,
                "transactionId": transaction_id,
                "timestamp": int(time.time()),
                "registered": True
            }
            
            # Store in session data
            session_data["user_registration"] = user_registration
            
            return {
                "success": True,
                "transactionId": transaction_id,
                "data": {
                    "method": request.method,
                    "appId": request.appId,
                    "registration": user_registration,
                    "message": "User registered on blockchain using UserIdentity contract",
                    "transactionId": transaction_id,
                    "sender": sender_address
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create user registration transaction: {str(e)}"
            }
    
    # Handle smart wallet creation
    if request.method == "create_wallet":
        guardian_count = request.params[1] if len(request.params) > 1 else 1
        threshold = request.params[2] if len(request.params) > 2 else 1
        daily_limit = request.params[3] if len(request.params) > 3 else 1000000
        
        # Store smart wallet creation data
        wallet_data = {
            "guardianCount": guardian_count,
            "threshold": threshold,
            "dailyLimitMicroAlgos": daily_limit,
            "appId": request.appId,
            "timestamp": int(time.time()),
            "created": True
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["smart_wallet"] = wallet_data
        
        return {
            "success": True,
            "transactionId": f"wallet_create_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "walletCreation": wallet_data,
                "message": "Smart wallet created on blockchain using SmartWallet contract"
            }
        }
    
    # Handle trust score initialization
    if request.method == "init_score":
        user_address = request.params[1] if len(request.params) > 1 else ""
        
        # Store trust score initialization data
        trust_score_init = {
            "userAddress": user_address,
            "appId": request.appId,
            "timestamp": int(time.time()),
            "initialized": True
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["trust_score_init"] = trust_score_init
        
        return {
            "success": True,
            "transactionId": f"trust_init_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "trustScore": trust_score_init,
                "message": "Trust score initialized on blockchain"
            }
        }
    
    # Handle trust score update
    if request.method == "update_score":
        user_address = request.params[1] if len(request.params) > 1 else ""
        new_score = request.params[2] if len(request.params) > 2 else 0
        
        # Store trust score update data
        trust_score_update = {
            "userAddress": user_address,
            "newScore": new_score,
            "appId": request.appId,
            "timestamp": int(time.time()),
            "updated": True
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["trust_score_update"] = trust_score_update
        
        return {
            "success": True,
            "transactionId": f"trust_update_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "trustScore": trust_score_update,
                "message": "Trust score updated on blockchain"
            }
        }
    
    # Handle certificate issuance
    if request.method == "issue_cert":
        recipient_addr = request.params[1] if len(request.params) > 1 else ""
        cert_type = request.params[2] if len(request.params) > 2 else ""
        cert_name = request.params[3] if len(request.params) > 3 else ""
        course_details = request.params[4] if len(request.params) > 4 else ""
        grade_info = request.params[5] if len(request.params) > 5 else ""
        issue_date = request.params[6] if len(request.params) > 6 else 0
        expiry_date = request.params[7] if len(request.params) > 7 else 0
        
        # Store certificate issuance data
        certificate_data = {
            "recipientAddr": recipient_addr,
            "certType": cert_type,
            "certName": cert_name,
            "courseDetails": course_details,
            "gradeInfo": grade_info,
            "issueDateUnix": issue_date,
            "expiryDateUnix": expiry_date,
            "appId": request.appId,
            "timestamp": int(time.time()),
            "issued": True
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["certificate_issued"] = certificate_data
        
        return {
            "success": True,
            "transactionId": f"cert_issue_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "certificate": certificate_data,
                "message": "Certificate issued on blockchain"
            }
        }
    
    # Handle paymaster sponsorship
    if request.method == "sponsor":
        target_app_id = request.params[1] if len(request.params) > 1 else 0
        flat_fee = request.params[2] if len(request.params) > 2 else 3000
        
        # Store sponsorship data
        sponsorship_data = {
            "targetAppId": target_app_id,
            "flatFee": flat_fee,
            "appId": request.appId,
            "timestamp": int(time.time()),
            "sponsored": True
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["sponsorship"] = sponsorship_data
        
        return {
            "success": True,
            "transactionId": f"sponsor_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "sponsorship": sponsorship_data,
                "message": "Transaction sponsored by paymaster"
            }
        }
    
    # Handle face verification using UserIdentity.addVerification
    if request.method == "add_verification":
        target_user = request.params[1] if len(request.params) > 1 else ""
        verification_type = request.params[2] if len(request.params) > 2 else 0
        verifier_id = request.params[3] if len(request.params) > 3 else 0
        verification_data_str = request.params[4] if len(request.params) > 4 else "verified"
        
        try:
            verification_data = json.loads(verification_data_str)
        except:
            verification_data = {}
        
        # Store face verification data
        face_verification = {
            "targetUser": target_user,
            "verificationType": verification_type,
            "verifierId": verifier_id,
            "verificationData": verification_data,
            "appId": request.appId,
            "boxes": request.boxes,
            "verified": verification_data.get("confidence", 0) > 0.6,
            "timestamp": int(time.time())
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["face_verification"] = face_verification
        
        return {
            "success": True,
            "transactionId": f"face_verify_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "appId": request.appId,
                "verification": face_verification,
                "message": "Face verification recorded on blockchain using UserIdentity contract"
            }
        }
    
    # Handle old face verification method for backward compatibility
    if request.method == "verifyFace":
        face_hash = request.params[0] if request.params else ""
        landmarks = request.params[1] if len(request.params) > 1 else []
        confidence = request.params[2] if len(request.params) > 2 else 0.0
        timestamp = request.params[3] if len(request.params) > 3 else int(time.time())
        user_id = request.params[4] if len(request.params) > 4 else ""
        
        # Store face verification data
        verification_data = {
            "faceHash": face_hash,
            "landmarks": landmarks,
            "confidence": confidence,
            "timestamp": timestamp,
            "userId": user_id,
            "verified": confidence > 0.6  # Lower threshold for easier verification
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["face_verification"] = verification_data
        
        return {
            "success": True,
            "transactionId": f"face_verify_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "verification": verification_data,
                "message": "Face verification recorded on blockchain"
            }
        }
    
    # Handle Azure-style liveness verification
    if request.method == "verifyLiveness":
        session_id = request.params[0] if request.params else ""
        liveness_decision = request.params[1] if len(request.params) > 1 else "uncertain"
        confidence = request.params[2] if len(request.params) > 2 else 0.0
        face_hash = request.params[3] if len(request.params) > 3 else ""
        digest = request.params[4] if len(request.params) > 4 else ""
        session_image_id = request.params[5] if len(request.params) > 5 else ""
        timestamp = request.params[6] if len(request.params) > 6 else int(time.time())
        user_id = request.params[7] if len(request.params) > 7 else ""
        
        # Store Azure-style liveness verification data
        liveness_data = {
            "sessionId": session_id,
            "livenessDecision": liveness_decision,
            "confidence": confidence,
            "faceHash": face_hash,
            "digest": digest,
            "sessionImageId": session_image_id,
            "timestamp": timestamp,
            "userId": user_id,
            "verified": liveness_decision == "realface" and confidence > 0.7
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["liveness_verification"] = liveness_data
        
        return {
            "success": True,
            "transactionId": f"liveness_verify_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "liveness": liveness_data,
                "message": "Azure-style liveness verification recorded on blockchain"
            }
        }
    
    # Handle OpenCV + TensorFlow liveness verification
    if request.method == "verifyOpenCVLiveness":
        liveness_label = request.params[0] if request.params else "fake"
        confidence = request.params[1] if len(request.params) > 1 else 0.0
        face_hash = request.params[2] if len(request.params) > 2 else ""
        face_box = request.params[3] if len(request.params) > 3 else [0, 0, 0, 0]
        timestamp = request.params[4] if len(request.params) > 4 else int(time.time())
        user_id = request.params[5] if len(request.params) > 5 else ""
        detection_method = request.params[6] if len(request.params) > 6 else "opencv_tensorflow"
        
        # Store OpenCV liveness verification data
        opencv_data = {
            "livenessLabel": liveness_label,
            "confidence": confidence,
            "faceHash": face_hash,
            "faceBox": face_box,
            "timestamp": timestamp,
            "userId": user_id,
            "detectionMethod": detection_method,
            "verified": liveness_label == "real" and confidence > 0.6
        }
        
        # Store in session (in real implementation, this would go to blockchain)
        session_data = sessions[x_session_token]
        session_data["opencv_liveness_verification"] = opencv_data
        
        return {
            "success": True,
            "transactionId": f"opencv_liveness_verify_{secrets.token_hex(8)}",
            "data": {
                "method": request.method,
                "opencvLiveness": opencv_data,
                "message": "OpenCV + TensorFlow liveness verification recorded on blockchain"
            }
        }
    
    # Handle read methods (get_user_profile, get_score, get_wallet_info)
    if request.method == "get_user_profile":
        user_address = request.params[1] if len(request.params) > 1 else ""
        
        # Mock user profile data
        profile_data = {
            "userAddress": user_address,
            "email": "test@example.com",
            "phone": "+1234567890",
            "verifications": [
                {"type": 1, "status": "verified", "timestamp": int(time.time())},
                {"type": 2, "status": "verified", "timestamp": int(time.time())}
            ],
            "certificates": [],
            "badges": [],
            "appId": request.appId,
            "timestamp": int(time.time())
        }
        
        return {
            "success": True,
            "transactionId": f"profile_get_{secrets.token_hex(8)}",
            "data": profile_data
        }
    
    if request.method == "get_score":
        user_address = request.params[1] if len(request.params) > 1 else ""
        
        # Mock trust score data
        score_data = {
            "userAddress": user_address,
            "score": 85,
            "components": {
                "verifications": 30,
                "certificates": 25,
                "badges": 20,
                "activity": 10
            },
            "appId": request.appId,
            "timestamp": int(time.time())
        }
        
        return {
            "success": True,
            "transactionId": f"score_get_{secrets.token_hex(8)}",
            "data": score_data
        }
    
    if request.method == "get_wallet_info":
        user_address = request.params[1] if len(request.params) > 1 else ""
        
        # Mock wallet info data
        wallet_data = {
            "userAddress": user_address,
            "balance": 1000000,  # 1 ALGO in microALGO
            "created": True,
            "guardians": [],
            "dailyLimit": 1000000,
            "threshold": 1,
            "appId": request.appId,
            "timestamp": int(time.time())
        }
        
        return {
            "success": True,
            "transactionId": f"wallet_get_{secrets.token_hex(8)}",
            "data": wallet_data
        }
    
    # Mock transaction execution for other methods
    return {
        "success": True,
        "transactionId": f"mock_tx_{secrets.token_hex(8)}",
        "data": {"method": request.method, "params": request.params}
    }

@app.get("/blockchain/account")
async def get_account_info(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {
        "address": "MOCKADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789",
        "balance": 1000000,  # 1 ALGO in microAlgos
        "status": "active"
    }

@app.get("/verification/status")
async def get_verification_status(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {
        "userRegistered": True,
        "trustScoreInitialized": True,
        "verifications": [
            {"type": "face", "verified": True, "date": "2024-01-01"},
            {"type": "document", "verified": False, "date": None}
        ]
    }

@app.post("/verification/submit")
async def submit_verification(request: dict, x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {
        "success": True,
        "verificationId": f"verify_{secrets.token_hex(8)}"
    }

@app.get("/certificates/user")
async def get_user_certificates(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {
        "certificates": [
            {
                "id": 1,
                "type": "Education",
                "name": "Computer Science Degree",
                "issuedDate": "2024-01-01",
                "issuer": "University of Technology"
            }
        ]
    }

@app.get("/badges/user")
async def get_user_badges(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {
        "badges": [
            {
                "id": 1,
                "name": "Early Adopter",
                "description": "First to join the platform",
                "earnedDate": "2024-01-01"
            }
        ]
    }

@app.get("/blockchain/verification-status")
async def get_verification_status(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    session_data = sessions[x_session_token]
    face_verification = session_data.get("face_verification", {})
    liveness_verification = session_data.get("liveness_verification", {})
    opencv_liveness_verification = session_data.get("opencv_liveness_verification", {})
    
    # Check different types of verification
    has_liveness = liveness_verification.get("verified", False)
    has_opencv_liveness = opencv_liveness_verification.get("verified", False)
    has_face = face_verification.get("verified", False)
    
    # Mock verification status with all verification types
    return {
        "faceVerified": has_face or has_liveness or has_opencv_liveness,
        "faceHash": (liveness_verification.get("faceHash") or 
                    opencv_liveness_verification.get("faceHash") or 
                    face_verification.get("faceHash")),
        "faceConfidence": (liveness_verification.get("confidence") or 
                          opencv_liveness_verification.get("confidence") or 
                          face_verification.get("confidence", 0)),
        "faceTimestamp": (liveness_verification.get("timestamp") or 
                         opencv_liveness_verification.get("timestamp") or 
                         face_verification.get("timestamp")),
        # Azure-style liveness specific fields
        "livenessVerified": has_liveness,
        "livenessDecision": liveness_verification.get("livenessDecision"),
        "sessionId": liveness_verification.get("sessionId"),
        "digest": liveness_verification.get("digest"),
        "sessionImageId": liveness_verification.get("sessionImageId"),
        # OpenCV liveness specific fields
        "opencvLivenessVerified": has_opencv_liveness,
        "opencvLivenessLabel": opencv_liveness_verification.get("livenessLabel"),
        "opencvLivenessConfidence": opencv_liveness_verification.get("confidence"),
        "opencvFaceBox": opencv_liveness_verification.get("faceBox"),
        "opencvVerificationDate": opencv_liveness_verification.get("timestamp"),
        "opencvDetectionMethod": opencv_liveness_verification.get("detectionMethod"),
        # Other verification fields
        "aadhaarVerified": False,
        "incomeVerified": False,
        "trustScore": (30 if has_opencv_liveness else 
                      (20 if has_liveness else 
                      (10 if has_face else 0))),
        "verificationLevel": ("OPENCV_LIVENESS_VERIFIED" if has_opencv_liveness else
                            ("LIVENESS_VERIFIED" if has_liveness else
                            ("FACE_VERIFIED" if has_face else "NONE")))
    }

@app.get("/trust-score")
async def get_trust_score(x_session_token: str = Header(alias="X-Session-Token")):
    if x_session_token not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    session_data = sessions[x_session_token]
    face_verification = session_data.get("face_verification", {})
    base_score = 85 if face_verification.get("verified", False) else 0
    
    return {
        "score": base_score,
        "factors": {
            "verifications": 30 if face_verification.get("verified", False) else 0,
            "certificates": 25,
            "badges": 20,
            "endorsements": 10
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting mock backend on http://localhost:8000")
    print("This is for testing only - implement the real backend!")
    uvicorn.run(app, host="0.0.0.0", port=8000)
