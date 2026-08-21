# ITR Verification System Setup Guide

## Overview

This streamlined ITR (Income Tax Return) verification system provides direct government portal automation to extract and verify certified income data. The system consists of:

- **Frontend**: React TypeScript application with streamlined verification workflow
- **Backend**: Node.js Express server with enhanced Puppeteer automation for Income Tax portal
- **Storage**: IPFS for decentralized storage of verified income data only
- **Focus**: Extract and store only the 3 key values - Assessment Year, Filing Date, and Certified Income

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│────│   Express API   │────│   IPFS Storage  │
│   (TypeScript)  │    │   (Node.js)     │    │  (Decentralized)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface│    │   Puppeteer     │    │   Document Hash │
│   Form Controls │    │   Automation    │    │   Metadata      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements
- Node.js (v16.0.0 or higher)
- npm or yarn package manager
- Chrome/Chromium browser (for Puppeteer)
- IPFS daemon (optional, for document storage)

### Software Installation

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Install IPFS (Optional)**
   - Download from [ipfs.io](https://ipfs.io/docs/install/)
   - For Windows: Use IPFS Desktop or command line
   - For development, you can skip this step (system will work without IPFS)

## Installation Steps

### 1. Clone and Setup Frontend

```powershell
# Navigate to your project directory
cd C:\Users\goura\identity-dapp

# Install frontend dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Setup Backend Server

```powershell
# Navigate to server directory
cd server

# Install server dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Optional: Setup IPFS

```powershell
# Install IPFS globally (if not using IPFS Desktop)
npm install -g ipfs

# Initialize IPFS repository
ipfs init

# Start IPFS daemon
ipfs daemon
```

**Note**: IPFS runs on port 5001 by default. If IPFS is not available, the system will continue to work but without decentralized storage.

## Running the Application

### Option 1: Development Mode (Recommended)

**Terminal 1: Start Frontend**
```powershell
# In project root directory
cd C:\Users\goura\identity-dapp
npm run dev
```

**Terminal 2: Start Backend**
```powershell
# In server directory
cd C:\Users\goura\identity-dapp\server
npm run dev
```

**Terminal 3: Start IPFS (Optional)**
```powershell
# Start IPFS daemon
ipfs daemon
```

### Option 2: Production Mode

**Frontend:**
```powershell
npm run build
npm run preview
```

**Backend:**
```powershell
cd server
npm start
```

## Accessing the Application

- **Frontend URL**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **IPFS WebUI**: http://localhost:5001/webui (if IPFS is running)

## Usage Guide

### Step 1: Verify Aadhaar-PAN Linkage

1. Open the application in your browser
2. Enter your 10-digit PAN number
3. Enter your 12-digit Aadhaar number
4. Click "Check Aadhaar-PAN Linkage"
5. Wait for verification (this may take 30-60 seconds)

### Step 2: Download and Process ITR

*Only available after successful Aadhaar-PAN verification*

1. Enter your registered mobile number
2. Enter your e-filing password
3. Click "Download & Process ITR"
4. The system will:
   - Login to the Income Tax portal
   - Download your latest ITR
   - Extract key data (Assessment Year, Filing Date, Total Income)
   - Store the document in IPFS (if available)
   - Display the extracted information

## API Endpoints

### Backend API Documentation

#### Health Check
- **GET** `/api/health`
- Returns server status and IPFS availability

#### Check Aadhaar-PAN Linkage
- **POST** `/api/check-aadhaar-pan-link`
- **Body**: `{ "panNumber": "ABCDE1234F", "aadhaarNumber": "123456789012" }`
- **Response**: `{ "linked": boolean, "status": string, "message": string }`

#### Verify and Extract ITR Data (Streamlined)
- **POST** `/api/verify-and-extract-itr`
- **Body**: `{ "panNumber": "ABCDE1234F", "phoneNumber": "9876543210", "password": "yourpassword" }`
- **Response**: 
```json
{
  "extractedData": {
    "assessmentYear": "2023-24",
    "dateOfFiling": "31-Mar-2024",
    "totalIncome": "500000"
  },
  "ipfsHash": "QmXxXxXxXxXxXxXx...",
  "metadataHash": "QmYyYyYyYyYyYyYy...",
  "message": "ITR data extracted and verified successfully",
  "verificationSource": "Income Tax E-filing Portal"
}
```

#### Legacy Download and Process ITR (Backwards Compatibility)
- **POST** `/api/download-process-itr`
- Same functionality as above but uses the original endpoint

## Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# Puppeteer Configuration
PUPPETEER_HEADLESS=false
PUPPETEER_TIMEOUT=30000
```

### Frontend Configuration

Update the fetch URLs in `ITRVerificationForm.tsx` if running on different ports:

```typescript
// Update these URLs if your backend runs on different ports
const API_BASE_URL = 'http://localhost:3001';
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Puppeteer Browser Launch Failed
```
Error: Failed to launch the browser process
```
**Solution:**
- Ensure Chrome/Chromium is installed
- On Windows, Puppeteer should download Chrome automatically
- Try running: `npm install puppeteer --force`

#### 2. CORS Errors
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**Solution:**
- Ensure the backend server is running on port 3001
- Check the CORS configuration in `server.js`
- Verify frontend is accessing the correct API URL

#### 3. IPFS Connection Failed
```
Error: IPFS client initialization failed
```
**Solution:**
- Start IPFS daemon: `ipfs daemon`
- Check IPFS is running on port 5001
- The system will work without IPFS, just without decentralized storage

#### 4. Income Tax Portal Changes
```
Could not find expected elements on the page
```
**Solution:**
- Government portals change frequently
- Update selectors in `server.js` if needed
- Use headless: false to debug browser automation

#### 5. PDF Extraction Fails
```
PDF extraction error
```
**Solution:**
- Ensure the downloaded file is a valid PDF
- Check if ITR format has changed
- Update regex patterns in `extractITRData` function

### Debug Mode

To run in debug mode with visible browser:

1. Set `headless: false` in Puppeteer launch options
2. Add delays to see automation steps:
   ```javascript
   await page.waitForTimeout(5000); // Wait 5 seconds
   ```
3. Enable console logging:
   ```javascript
   page.on('console', msg => console.log('PAGE LOG:', msg.text()));
   ```

## Security Considerations

### Data Privacy
- User credentials are never stored on the server
- PAN numbers are partially masked in logs
- Downloaded PDFs are automatically deleted after processing
- IPFS storage provides decentralized access without central control

### Best Practices
- Always use HTTPS in production
- Implement rate limiting for API endpoints
- Add input validation and sanitization
- Use environment variables for sensitive configuration
- Consider implementing user authentication for production use

### Security Headers
Add these headers in production:
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## Deployment

### Frontend Deployment (Vercel/Netlify)
```powershell
npm run build
# Deploy the dist/ folder
```

### Backend Deployment (Heroku/Railway)
```powershell
# Add Procfile
echo "web: node server.js" > server/Procfile

# Set environment variables
# NODE_ENV=production
# PUPPETEER_HEADLESS=true
```

### Docker Deployment
Create `Dockerfile` in server directory:
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

If you encounter issues:

1. Check this documentation first
2. Review the troubleshooting section
3. Check console logs for detailed error messages
4. Create an issue in the GitHub repository

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Quick Start Checklist

- [ ] Node.js installed (v16+)
- [ ] Dependencies installed (`npm install` in both root and server/)
- [ ] IPFS daemon running (optional)
- [ ] Frontend started (`npm run dev`)
- [ ] Backend started (`cd server && npm run dev`)
- [ ] Accessed http://localhost:5173
- [ ] Tested with valid PAN and Aadhaar numbers

**Happy coding! 🚀**
