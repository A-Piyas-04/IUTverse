// Test script for IUTVerse user update API
// Run this file with: node test-user-update.js

const fetch = require("node-fetch"); // You might need to install: npm install node-fetch

const SERVER_URL = "http://localhost:3000";

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login with email: ${email}`);

  try {
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);

    if (response.ok && data.token) {
      console.log("✅ Login successful");
      return data.token;
    } else {
      console.log("❌ Login failed:", data.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return null;
  }
}

async function testUpdateUserName(token, newName) {
  console.log(`\n✏️ Testing user name update to: "${newName}"`);

  try {
    const response = await fetch(`${SERVER_URL}/api/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", data);

    if (response.ok) {
      console.log("✅ Name update successful");
      return true;
    } else {
      console.log("❌ Name update failed:", data.message);
      return false;
    }
  } catch (error) {
    console.error("❌ Update error:", error.message);
    return false;
  }
}

async function testUpdateUserNameValidation(token) {
  console.log(`\n🧪 Testing validation scenarios...`);

  const testCases = [
    { name: "", description: "Empty name" },
    { name: "   ", description: "Whitespace only" },
    { name: "A", description: "Too short (1 character)" },
    { name: "A".repeat(51), description: "Too long (51 characters)" },
    { name: null, description: "Null value" },
  ];

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.description}`);

    try {
      const response = await fetch(`${SERVER_URL}/api/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: testCase.name }),
      });

      const data = await response.json();
      console.log(`  Status: ${response.status} - ${data.message}`);

      if (response.status === 400) {
        console.log("  ✅ Validation working correctly");
      } else {
        console.log("  ❌ Unexpected response");
      }
    } catch (error) {
      console.error("  ❌ Test error:", error.message);
    }
  }
}

async function testWithoutToken() {
  console.log(`\n🔒 Testing without authentication token...`);

  try {
    const response = await fetch(`${SERVER_URL}/api/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Test Name" }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log("Response:", data);

    if (response.status === 401) {
      console.log("✅ Authentication protection working correctly");
    } else {
      console.log("❌ Authentication protection failed");
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting IUTVerse User Update API Tests\n");

  // Test without authentication first
  await testWithoutToken();

  // Replace with your test credentials
  const testEmail = "test@iut-dhaka.edu";
  const testPassword = "your-test-password"; // Replace with actual password

  console.log("\n📝 Please ensure you have a test user account set up");
  console.log(`Email: ${testEmail}`);
  console.log("Password: [Replace with your test password]");

  // Login to get token
  const token = await testLogin(testEmail, testPassword);

  if (!token) {
    console.log("\n❌ Cannot proceed with tests - login failed");
    console.log("Please ensure:");
    console.log("1. Server is running on http://localhost:3000");
    console.log("2. Test user exists with correct credentials");
    return;
  }

  // Test successful name update
  await testUpdateUserName(token, "John Doe");
  await testUpdateUserName(token, "Jane Smith");

  // Test validation scenarios
  await testUpdateUserNameValidation(token);

  console.log("\n🎉 All tests completed!");
}

// Run the tests
runTests().catch(console.error);
