# IUTverse Frontend-Backend Routing Test Script

Write-Host "Testing IUTverse API Endpoints..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

$baseUrl = "http://localhost:3000"

# Test 1: Server health check
Write-Host "`n1. Testing server health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method Get
    Write-Host "✓ Server is running: $response" -ForegroundColor Green
} catch {
    Write-Host "✗ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test signup endpoint
Write-Host "`n2. Testing signup endpoint..." -ForegroundColor Yellow
$signupData = @{
    email = "test@iut-dhaka.edu"
    password = "testpass"
} | ConvertTo-Json

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/signup" -Method Post -Body $signupData -Headers $headers
    Write-Host "✓ Signup successful: $($response.message)" -ForegroundColor Green
    if ($response.devPassword) {
        Write-Host "  Dev Password: $($response.devPassword)" -ForegroundColor Cyan
        $script:testPassword = $response.devPassword
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Signup failed: $($errorDetails.message)" -ForegroundColor Red
}

# Test 3: Test login endpoint
Write-Host "`n3. Testing login endpoint..." -ForegroundColor Yellow
if ($script:testPassword) {
    $loginData = @{
        email = "test@iut-dhaka.edu"
        password = $script:testPassword
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/login" -Method Post -Body $loginData -Headers $headers
        Write-Host "✓ Login successful: $($response.message)" -ForegroundColor Green
        if ($response.token) {
            Write-Host "  Token received: $($response.token.Substring(0, 20))..." -ForegroundColor Cyan
            $script:authToken = $response.token
        }
    } catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✗ Login failed: $($errorDetails.message)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipping login test - no password from signup" -ForegroundColor Red
}

# Test 4: Test protected route
Write-Host "`n4. Testing protected route..." -ForegroundColor Yellow
if ($script:authToken) {
    try {
        $authHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $($script:authToken)"
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/profile" -Method Get -Headers $authHeaders
        Write-Host "✓ Protected route access successful: $($response.message)" -ForegroundColor Green
    } catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✗ Protected route failed: $($errorDetails.message)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipping protected route test - no auth token" -ForegroundColor Red
}

# Test 5: Test get all users
Write-Host "`n5. Testing get all users endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Get
    Write-Host "✓ Users retrieved: $($response.Length) users found" -ForegroundColor Green
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Get users failed: $($errorDetails.message)" -ForegroundColor Red
}

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "API testing completed!" -ForegroundColor Green
