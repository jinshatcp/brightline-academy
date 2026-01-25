$ErrorActionPreference = "Stop"

# Configuration
$ProjectRoot = Get-Location
$WebDir = Join-Path $ProjectRoot "web"
$CmdDir = Join-Path $ProjectRoot "cmd\liveclass"
$BinaryName = "liveclass.exe"
$BinaryPath = Join-Path $ProjectRoot $BinaryName

# Colors
$Green = "Green"
$Cyan = "Cyan"
$Yellow = "Yellow"

function Log-Message([string]$msg, [ConsoleColor]$color = "White") {
    Write-Host "==> $msg" -ForegroundColor $color
}

# Add Go to Path if it exists in standard location (fix for fresh installs)
if (Test-Path "C:\Program Files\Go\bin") {
    $env:Path = "C:\Program Files\Go\bin;" + $env:Path
}


# 1. Get Local IP
Log-Message "Detecting local IP address..." $Cyan
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "*Wi-Fi*" -ErrorAction SilentlyContinue).IPAddress
if (-not $LocalIP) {
    # Fallback if Wi-Fi not found
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.PrefixOrigin -eq "Dhcp" } | Select-Object -First 1).IPAddress
}
if (-not $LocalIP) { $LocalIP = "localhost" }

# 2. Build Frontend
Log-Message "Building frontend..." $Green
Push-Location $WebDir

if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    if (-not (Test-Path "node_modules")) {
        Log-Message "Installing dependencies..."
        npm install
    }
    npm run build
}
else {
    Log-Message "npm not found. Checking for existing build..." $Yellow
    if (-not (Test-Path "$CmdDir/dist/index.html")) {
        Log-Message "Error: npm not found and no existing frontend build in cmd/liveclass/dist!" "Red"
        exit 1
    }
    Log-Message "Using existing frontend build." $Green
}
Pop-Location

# 3. Build Backend
Log-Message "Building backend..." $Green
if (-not (Test-Path "$CmdDir/dist")) {
    Log-Message "Warning: Frontend build dist not found in backend dir!" $Yellow
}
go build -o $BinaryPath $CmdDir

# 4. Run
Log-Message "Starting LiveClass..." $Green
Log-Message "-----------------------------------------------------" $Cyan
Log-Message "Local:   http://localhost:8080" $Cyan
Log-Message "Network: http://$($LocalIP):8080" $Cyan
Log-Message "Login:   admin@liveclass.com / admin123" $Yellow
Log-Message "-----------------------------------------------------" $Cyan

$env:PORT = "8080"
$env:HOST = "0.0.0.0"
$env:MONGO_URI = "mongodb://127.0.0.1:27017"

& $BinaryPath
