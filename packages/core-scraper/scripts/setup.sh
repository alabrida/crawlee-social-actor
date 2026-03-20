#!/bin/bash
# Local Production Environment Reproduction (Linux/WSL/Git Bash)
# This script mirrors the Apify Actor environment locally.

echo "--- Starting Local Production Environment Reproduction ---"

# 1. Version Checks
REQUIRED_NODE=20
CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$CURRENT_NODE" -lt "$REQUIRED_NODE" ]; then
    echo "Error: Required Node.js version is >= $REQUIRED_NODE. Current version: $(node -v)"
    exit 1
fi
echo "Node.js version $(node -v) is valid."

# 2. Environment Configuration
if [ ! -f ".env" ]; then
    if [ -f "MASTER.env" ]; then
        echo "Creating .env from MASTER.env..."
        cp MASTER.env .env
    elif [ -f ".env.example" ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    fi
else
    echo ".env file already exists."
fi

# 3. Create Required Directories
mkdir -p storage logs results debug inputs

# 4. Install Dependencies
echo "Installing dependencies..."
npm install --audit=false

# 5. Playwright Configuration
echo "Installing Playwright browser binaries..."
npx playwright install chromium

# 6. Build the Application
echo "Building application..."
npm run build

# 7. Final Verification
if [ -f "dist/main.js" ]; then
    echo -e "\nSUCCESS: Local production environment reproduced successfully."
    echo "Compiled entry point found at dist/main.js"
else
    echo "Error: Build failed or dist/main.js not found."
    exit 1
fi
