# IUTVerse Authentication Test Script
# Run this script with: powershell -ExecutionPolicy Bypass -File test-simple.ps1

$serverUrl = "http://localhost:3000"

Write-Host "Starting IUTVerse Authentication Tests" -ForegroundColor Green
Write-Host ""

# Test 1: Valid IUT email signup
Write-Host "Testing signup with valid IUT email..." -ForegroundColor Yellow
try {
    $body = @{
        email = "john.doe123@iut-dhaka.edu"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$serverUrl/api/signup" -Method POST -ContentType "application/json" -Body $body
    Write-Host "Signup successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json | Write-Host -ForegroundColor Cyan
    
    if ($response.devPassword) {
        Write-Host "Generated password: $($response.devPassword)" -ForegroundColor Magenta
        $script:testPassword = $response.devPassword
    }
} catch {
    Write-Host "Signup failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Login with generated password
if ($script:testPassword) {
    Write-Host "Testing login with generated password..." -ForegroundColor Yellow
    try {
        $loginBody = @{
            email = "john.doe123@iut-dhaka.edu"
            password = $script:testPassword
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod -Uri "$serverUrl/api/login" -Method POST -ContentType "application/json" -Body $loginBody
        Write-Host "Login successful!" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Cyan
        $loginResponse | ConvertTo-Json | Write-Host -ForegroundColor Cyan
    } catch {
        Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Invalid email domain
Write-Host "Testing invalid email (non-IUT domain)..." -ForegroundColor Yellow
try {
    $invalidBody = @{
        email = "student@gmail.com"
    } | ConvertTo-Json

    $invalidResponse = Invoke-RestMethod -Uri "$serverUrl/api/signup" -Method POST -ContentType "application/json" -Body $invalidBody
    Write-Host "This should have failed!" -ForegroundColor Red
} catch {
    Write-Host "Correctly rejected invalid email" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Get all users
Write-Host "Getting all registered users..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$serverUrl/api/users" -Method GET
    Write-Host "Users retrieved successfully!" -ForegroundColor Green
    Write-Host "Users:" -ForegroundColor Cyan
    $users | ConvertTo-Json | Write-Host -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Tests completed!" -ForegroundColor Green
