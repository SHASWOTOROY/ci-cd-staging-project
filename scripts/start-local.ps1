# Local dev startup (no Docker)
# Usage: .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

# Load .env
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

if (-not $env:DB_PASSWORD -or $env:DB_PASSWORD -eq "YOUR_POSTGRES_PASSWORD_HERE") {
    Write-Host ""
    Write-Host "PostgreSQL password required." -ForegroundColor Yellow
    $secure = Read-Host "Enter postgres user password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

    # Save to .env for next time
    (Get-Content $envFile) -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$($env:DB_PASSWORD)" | Set-Content $envFile
    Write-Host "Password saved to .env" -ForegroundColor Green
}

Write-Host "Setting up database..." -ForegroundColor Cyan
node server/src/setup-local.js
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Starting app..." -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001/api/health" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npx concurrently -n server,client -c blue,green "npm run dev:server" "npm run dev:client"
