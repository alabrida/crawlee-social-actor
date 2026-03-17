# Reproduce Local Production Environment Script
# This script mirrors the Apify Actor environment locally for auditing and debugging.

Write-Host "--- Starting Local Production Environment Reproduction ---" -ForegroundColor Cyan

# 1. Version Checks
$requiredNodeVersion = 20
$currentNodeVersion = node -v
if ($currentNodeVersion -match "v(\d+)") {
    $versionNum = [int]$matches[1]
    if ($versionNum -lt $requiredNodeVersion) {
        Write-Error "Required Node.js version is >= $requiredNodeVersion. Current version: $currentNodeVersion. This is required for --env-file support."
        exit 1
    }
    Write-Host "Node.js version $currentNodeVersion is valid." -ForegroundColor Green
}

# 2. Environment Configuration
if (-not (Test-Path ".env")) {
    if (Test-Path "MASTER.env") {
        Write-Host "Creating .env from MASTER.env..." -ForegroundColor Yellow
        Copy-Item "MASTER.env" ".env"
    } elseif (Test-Path ".env.example") {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    } else {
        Write-Warning ".env, MASTER.env, and .env.example not found. Please ensure environment variables are manually configured."
    }
} else {
    Write-Host ".env file already exists." -ForegroundColor Green
}

# 2b. Validate .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $tokens = @("AUTH_TOKENS_FACEBOOK", "AUTH_TOKENS_INSTAGRAM", "AUTH_TOKENS_X", "AUTH_TOKENS_LINKEDIN", "SERP_API_KEY")
    
    foreach ($token in $tokens) {
        if ($envContent -match "YOUR_${token}_HERE" -or $envContent -match "YOUR_TOKEN_HERE") {
            Write-Warning "WARNING: Your .env file contains placeholder for $token. The actor may fail to authenticate or bypass walls."
        }
    }

    if ($envContent -notmatch "AUTH_TOKENS_") {
        Write-Warning "WARNING: No authentication tokens found in .env. Social media platforms will likely be blocked."
    }
}

# 3. Create Required Directories
$dirs = @("storage", "logs", "results", "debug", "inputs")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "Creating directory: $dir..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# 4. Install Dependencies
Write-Host "Installing dependencies (npm install)..." -ForegroundColor Cyan
npm install --audit=false
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed with exit code $LASTEXITCODE. Try running 'npm cache clean --force' if this persists."
    exit $LASTEXITCODE
}

# 5. Playwright Configuration
Write-Host "Installing Playwright browser binaries..." -ForegroundColor Cyan
npx playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Error "Playwright installation failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# 6. Build the Application
Write-Host "Building application (npm run build)..." -ForegroundColor Cyan
# Ensure we compile for production
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code $LASTEXITCODE. This usually indicates TypeScript errors."
    exit $LASTEXITCODE
}

# 7. Final Verification
if (Test-Path "dist/main.js") {
    Write-Host "`nSUCCESS: Local production environment reproduced successfully." -ForegroundColor Green
    Write-Host "Compiled entry point found at dist/main.js"
    Write-Host "You can now run 'npm start' or 'npm run dev' for debugging."
} else {
    Write-Error "Build failed or dist/main.js not found. Please check logs above."
    exit 1
}

Write-Host "--- Reproduction Complete ---" -ForegroundColor Cyan
