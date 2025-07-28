#!/usr/bin/env powershell
# IUTverse Test Runner
# Run all server tests in sequence

param(
    [string]$TestType = "all"
)

$serverTestsPath = "tests/server"
$baseDir = $PSScriptRoot

Write-Host "🧪 IUTverse Test Runner" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

# Check if server is running
Write-Host "`nChecking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/" -Method Get -TimeoutSec 5
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start the server first." -ForegroundColor Red
    Write-Host "   Run: cd Codebase/server && npm start" -ForegroundColor Cyan
    exit 1
}

Write-Host "`nRunning tests..." -ForegroundColor Yellow

switch ($TestType.ToLower()) {
    "auth" {
        Write-Host "`n🔐 Running Authentication Tests..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$serverTestsPath/test-auth.ps1"
    }
    "routes" {
        Write-Host "`n🛣️  Running Routes Tests..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$serverTestsPath/test-routes.ps1"
    }
    "simple" {
        Write-Host "`n🔧 Running Simple Tests..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$serverTestsPath/test-simple.ps1"
    }
    "node" {
        Write-Host "`n🟢 Running Node.js Tests..." -ForegroundColor Cyan
        Push-Location $serverTestsPath
        node test-auth.js
        Pop-Location
    }
    "all" {
        Write-Host "`n🔐 Running Authentication Tests..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$serverTestsPath/test-auth.ps1"
        
        Write-Host "`n🛣️  Running Routes Tests..." -ForegroundColor Cyan
        & powershell -ExecutionPolicy Bypass -File "$serverTestsPath/test-routes.ps1"
        
        Write-Host "`n🟢 Running Node.js Tests..." -ForegroundColor Cyan
        Push-Location $serverTestsPath
        node test-auth.js
        Pop-Location
    }
    default {
        Write-Host "❌ Unknown test type: $TestType" -ForegroundColor Red
        Write-Host "Available options: all, auth, routes, simple, node" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n✅ Test run completed!" -ForegroundColor Green
