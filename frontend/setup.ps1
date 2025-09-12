# ITR Verification System Setup Script
# Run this script in PowerShell to set up the project

Write-Host "🚀 Setting up ITR Verification System..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install frontend dependencies
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location server
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open two terminal windows" -ForegroundColor White
Write-Host "2. In Terminal 1, run: npm run dev (for frontend)" -ForegroundColor White
Write-Host "3. In Terminal 2, run: cd server && npm run dev (for backend)" -ForegroundColor White
Write-Host "4. Optional: Start IPFS daemon with 'ipfs daemon'" -ForegroundColor White
Write-Host "5. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see ITR_VERIFICATION_SETUP.md" -ForegroundColor Gray
