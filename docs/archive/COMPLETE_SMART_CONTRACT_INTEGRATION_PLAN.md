# Complete Smart Contract Integration Plan

## 📋 **Line-by-Line Analysis of Smart Contract Metadata**

### **1. Contract Addresses (from contract_addresses.json):**
```json
{
  "organization_registry": { "app_id": 745680367, "address": "PTWNJTFOOQPMMSMA3EZJPQT5GZXTDJTYK6YRC7IY6BEHYLAIDY3X6T76FQ" },
  "user_identity": { "app_id": 745680430, "address": "QOV3RLSWRZCKUIJNQOAD2D2WUNHVSFV4QRY3LF6X4WD4BEMUIO66PIGZLM" },
  "trust_score": { "app_id": 745680432, "address": "GJ5FFFX737KYW3ETGGZZ73BPUCEL7PVWSDYV7WP77ZLTXAXLVEBBZUVA64" },
  "certificate_management": { "app_id": 745680498, "address": "XVRC637FC7UFV4TCMZ4C4HNQNNXHDO6XZ3FIZLDCWQWIXXNXFKYCTHLZUY" },
  "badge_system": { "app_id": 745680508, "address": "BW3MSJAQFCZXSSX4JEZ6MOJDDTUCG5UYOUHXUHF3B2WHZGZTAZ62NVTI4E" },
  "smart_wallet": { "app_id": 745680538, "address": "JYXRKNFCRGNOEOS44TYFV4RLLZAHGRSEMCYE5JNZHB57JH3HR6AKHVOQ6Q" },
  "governance": { "app_id": 745680789, "address": "L2HOWUHQK62DV6XRVB6PK2DAW2Q5JOP24QC5EBKJ2FI4UFDWP74LYUCHPY" },
  "dispute_resolution": { "app_id": 745680790, "address": "6GO325DAKB5JC54N2BJSRXPUFNMEBFXG6LALHM25IRYJNE4ATAYBYKHWRI" },
  "paymaster": { "app_id": 745692491, "address": "7WFIZJ7NVSZJI6BZNPAK2ADOR7KCYLRFIDLV2EGZ637V77XKC65OAEFFDI" }
}
```

### **2. Key Functions Analysis:**

#### **A. User Registration Flow:**
```typescript
// 1. SmartWallet.createWallet() - Create user's smart wallet
SmartWallet.createWallet(sender, guardianCount, threshold, dailyLimitMicroAlgos)
// App ID: 745680538

// 2. UserIdentity.registerUser() - Register user identity
UserIdentity.registerUser(sender, email, phone)
// App ID: 745680430

// 3. TrustScore.initScore() - Initialize trust score
TrustScore.initScore(sender, userAddr)
// App ID: 745680432
```

#### **B. Verification Flow:**
```typescript
// Face Verification
UserIdentity.addVerification(sender, targetUser, verificationType, verifierId, verificationData)
// verificationType: 1 (face), verifierId: 1 (system)
// Boxes: [{ name: 'user_' + targetUser }]

// Aadhaar Verification
UserIdentity.addVerification(sender, targetUser, verificationType, verifierId, verificationData)
// verificationType: 2 (aadhaar), verifierId: 1 (system)

// Income Verification
UserIdentity.addVerification(sender, targetUser, verificationType, verifierId, verificationData)
// verificationType: 3 (income), verifierId: 1 (system)
```

#### **C. Certificate & Badge Flow:**
```typescript
// Issue Certificate
Certificates.issueCertificate(sender, recipientAddr, certType, certName, courseDetails, gradeInfo, issueDateUnix, expiryDateUnix)
// App ID: 745680498

// Issue Badge
Badges.issueBadge(sender, recipient, templateId, evidence, metadata)
// App ID: 745680508
```

## 🔄 **Complete Workflow Implementation**

### **Phase 1: Wallet Connection & User Registration**
1. **Wallet Connection** → Generate Algorand address
2. **SmartWallet.createWallet()** → Create smart wallet with guardians
3. **UserIdentity.registerUser()** → Register user identity
4. **TrustScore.initScore()** → Initialize trust score

### **Phase 2: Verification Process**
1. **Face Verification** → UserIdentity.addVerification(type=1)
2. **Aadhaar Verification** → UserIdentity.addVerification(type=2)
3. **Income Verification** → UserIdentity.addVerification(type=3)

### **Phase 3: Document Processing**
1. **Aadhaar QR Decoding** → Extract data using anon-aadhaar
2. **ITR Download & Processing** → Extract income details
3. **Merkle Tree Generation** → Create proof structure
4. **QR Code Generation** → Generate verification QR

### **Phase 4: Certificate & Badge Issuance**
1. **Certificate Issuance** → Certificates.issueCertificate()
2. **Badge Issuance** → Badges.issueBadge()
3. **Trust Score Update** → TrustScore.updateScore()

## 🛠 **Implementation Steps**

### **Step 1: Fix Current Backend Issues**
- ✅ Fixed secrets import error
- ✅ Backend running on localhost:8000

### **Step 2: Update Frontend Integration**
- Update all smart contract calls to use exact function signatures
- Implement proper error handling
- Add wallet creation flow

### **Step 3: Add Aadhaar Integration**
- Implement anon-aadhaar for ZKP
- Add QR code scanning
- Extract and map Aadhaar data

### **Step 4: Add ITR Processing**
- Web scraping for ITR download
- Data extraction and validation
- Income verification

### **Step 5: Add Merkle Tree & QR Generation**
- Implement Merkle tree structure
- Generate verification QR codes
- Store proofs on IPFS

## 🎯 **Next Actions**
1. Test current backend fixes
2. Update frontend to use exact smart contract functions
3. Implement wallet creation flow
4. Add Aadhaar integration
5. Add ITR processing
6. Add Merkle tree generation
