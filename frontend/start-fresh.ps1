# Fresh Server Startup Script
param(
    [switch]$SkipTests = $false
)

Write-Host "🚀 Starting Fresh ITR Verification System..." -ForegroundColor Green
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    try {
        $tcpConnection = New-Object System.Net.Sockets.TcpClient
        $tcpConnection.Connect("localhost", $Port)
        $tcpConnection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Kill any existing processes
Write-Host "🔄 Stopping existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Check dependencies
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan
if (!(Test-Path "node_modules")) {
    Write-Host "❌ Frontend dependencies missing. Please run: npm install" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "server/node_modules")) {
    Write-Host "❌ Server dependencies missing. Please run: cd server && npm install" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies found" -ForegroundColor Green

# Test server connection
if (!$SkipTests) {
    Write-Host "🧪 Testing server startup..." -ForegroundColor Cyan
    
    # Start server in background
    $serverJob = Start-Job -ScriptBlock {
        Set-Location "C:\Users\goura\identity-dapp\server"
        node server.js
    }
    
    # Wait for server to start
    Start-Sleep -Seconds 5
    
    # Test health endpoint
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 10
        Write-Host "✅ Server health check passed: $($response.status)" -ForegroundColor Green
        Write-Host "🌐 IPFS Status: $(if($response.ipfsAvailable) {'Available'} else {'Not Available (Optional)'})" -ForegroundColor $(if($response.ipfsAvailable) {'Green'} else {'Yellow'})
    }
    catch {
        Write-Host "⚠️ Server health check failed, but continuing..." -ForegroundColor Yellow
    }
    
    # Stop test job
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎯 Ready to start! Choose your option:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1 - Start Backend Only:" -ForegroundColor White
Write-Host "  cd server" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 - Start Frontend Only:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3 - Start Both (Recommended):" -ForegroundColor White
Write-Host "  Open 2 terminals:" -ForegroundColor Gray
Write-Host "  Terminal 1: cd server && npm run dev" -ForegroundColor Gray
Write-Host "  Terminal 2: npm run dev" -ForegroundColor Gray
Write-Host ""

# Ask user what they want to do
$choice = Read-Host "Do you want to start the backend now? (y/n)"
if ($choice -eq "y" -or $choice -eq "Y") {
    Write-Host ""
    Write-Host "🖥️ Starting Backend Server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location server
    npm run dev
} else {
    Write-Host ""
    Write-Host "💡 Manual start instructions:" -ForegroundColor Cyan
    Write-Host "1. Open terminal 1: cd server && npm run dev" -ForegroundColor White
    Write-Host "2. Open terminal 2: npm run dev" -ForegroundColor White
    Write-Host "3. Visit: http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ System is ready!" -ForegroundColor Green
}
