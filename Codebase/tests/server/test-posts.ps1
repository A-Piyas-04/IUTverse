# IUTverse Posts API Test Script

Write-Host "Testing IUTverse Posts API..." -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

$baseUrl = "http://localhost:3000"
$script:authToken = $null

# Test 1: Login to get auth token
Write-Host "`n1. Logging in to get auth token..." -ForegroundColor Yellow
$loginData = @{
    email = "test@iut-dhaka.edu"
    password = "testpass123"  # Replace with actual password
} | ConvertTo-Json

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginData -Headers $headers
    Write-Host "✓ Login successful" -ForegroundColor Green
    if ($response.token) {
        $script:authToken = $response.token
        Write-Host "  Token received" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Login failed. Please make sure you have a valid user account." -ForegroundColor Red
    Write-Host "  Create an account first using signup endpoint" -ForegroundColor Yellow
    exit 1
}

# Set up auth headers for protected routes
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $($script:authToken)"
}

# Test 2: Create a new post
Write-Host "`n2. Creating a new post..." -ForegroundColor Yellow
$postData = @{
    content = "This is a test post from the API! 🚀"
    category = "general"
    isAnonymous = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/posts" -Method Post -Body $postData -Headers $authHeaders
    Write-Host "✓ Post created successfully" -ForegroundColor Green
    Write-Host "  Post ID: $($response.post.id)" -ForegroundColor Cyan
    Write-Host "  Content: $($response.post.content)" -ForegroundColor Cyan
    $script:createdPostId = $response.post.id
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Post creation failed: $($errorDetails.message)" -ForegroundColor Red
}

# Test 3: Get all posts
Write-Host "`n3. Fetching all posts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/posts" -Method Get -Headers $authHeaders
    Write-Host "✓ Posts retrieved successfully" -ForegroundColor Green
    Write-Host "  Total posts: $($response.posts.Length)" -ForegroundColor Cyan
    
    if ($response.posts.Length -gt 0) {
        Write-Host "  Latest post: $($response.posts[0].content.Substring(0, [Math]::Min(50, $response.posts[0].content.Length)))..." -ForegroundColor Cyan
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Failed to fetch posts: $($errorDetails.message)" -ForegroundColor Red
}

# Test 4: Get current user's posts
Write-Host "`n4. Fetching current user's posts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/posts/my-posts" -Method Get -Headers $authHeaders
    Write-Host "✓ User posts retrieved successfully" -ForegroundColor Green
    Write-Host "  User's posts count: $($response.posts.Length)" -ForegroundColor Cyan
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Failed to fetch user posts: $($errorDetails.message)" -ForegroundColor Red
}

# Test 5: Like a post (if we created one)
if ($script:createdPostId) {
    Write-Host "`n5. Liking the created post..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/posts/$($script:createdPostId)/like" -Method Post -Headers $authHeaders
        Write-Host "✓ Post liked successfully" -ForegroundColor Green
        Write-Host "  Liked: $($response.liked)" -ForegroundColor Cyan
        Write-Host "  Likes count: $($response.likesCount)" -ForegroundColor Cyan
    } catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✗ Failed to like post: $($errorDetails.message)" -ForegroundColor Red
    }
}

# Test 6: Get dashboard data
Write-Host "`n6. Fetching dashboard data..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/dashboard" -Method Get -Headers $authHeaders
    Write-Host "✓ Dashboard data retrieved successfully" -ForegroundColor Green
    Write-Host "  User posts: $($response.data.posts.Length)" -ForegroundColor Cyan
    Write-Host "  Feed posts: $($response.data.feed.Length)" -ForegroundColor Cyan
    Write-Host "  Total likes: $($response.data.stats.totalLikes)" -ForegroundColor Cyan
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Failed to fetch dashboard: $($errorDetails.message)" -ForegroundColor Red
}

# Test 7: Get profile data
Write-Host "`n7. Fetching profile data..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/profile" -Method Get -Headers $authHeaders
    Write-Host "✓ Profile data retrieved successfully" -ForegroundColor Green
    Write-Host "  Profile posts: $($response.posts.Length)" -ForegroundColor Cyan
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✗ Failed to fetch profile: $($errorDetails.message)" -ForegroundColor Red
}

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "Posts API testing completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
