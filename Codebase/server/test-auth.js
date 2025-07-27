// Test script for IUTVerse authentication
// Run this file with: node test-auth.js

const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

const SERVER_URL = 'http://localhost:3000';

async function testSignup(email) {
  console.log(`\n🧪 Testing signup with email: ${email}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    if (data.devPassword) {
      console.log(`🔑 Generated password: ${data.devPassword}`);
      return { email, password: data.devPassword };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Signup error:', error.message);
    return null;
  }
}

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login with email: ${email} and password: ${password}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    return response.ok;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function testInvalidEmail(email) {
  console.log(`\n❌ Testing invalid email: ${email}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting IUTVerse Authentication Tests\n');
  
  // Test 1: Valid IUT email signup
  const user1 = await testSignup('john.doe123@iut-dhaka.edu');
  
  // Test 2: Another valid IUT email
  const user2 = await testSignup('alice.smith456@iut-dhaka.edu');
  
  // Test 3: Invalid email (non-IUT domain)
  await testInvalidEmail('student@gmail.com');
  
  // Test 4: Invalid email (wrong IUT domain)
  await testInvalidEmail('student@iut-dhaka.com');
  
  // Test 5: Login with correct credentials
  if (user1) {
    await testLogin(user1.email, user1.password);
  }
  
  // Test 6: Login with incorrect password
  if (user1) {
    await testLogin(user1.email, 'wrongpassword');
  }
  
  // Test 7: Login with non-existent user
  await testLogin('nonexistent@iut-dhaka.edu', 'somepassword');
  
  console.log('\n✅ Tests completed!');
}

// Run tests
runTests().catch(console.error);
