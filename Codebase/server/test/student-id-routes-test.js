/**
 * Test file for Student ID CRUD operations
 * This is a simple test to verify the routes are working correctly
 * Run this after starting the server to test the endpoints
 */

const axios = require("axios");

// Base URL for your server
const BASE_URL = "http://localhost:3001"; // Adjust port if different

// Sample token (you'll need to get this from login)
let authToken = "";

// Test data
const testStudentId = "TEST-2024-001";

async function runTests() {
  console.log("🧪 Starting Student ID CRUD Tests...\n");

  try {
    // You would need to implement login first to get the token
    console.log("⚠️  Note: You need to implement login to get authToken first");
    console.log("📋 Available endpoints:");
    console.log("PUT    /api/user/student-id              - Update student ID");
    console.log(
      "GET    /api/user/student-id              - Get current user student ID"
    );
    console.log("DELETE /api/user/student-id              - Delete student ID");
    console.log(
      "GET    /api/user/student-id/check/:id    - Check availability"
    );
    console.log(
      "GET    /api/user/by-student-id/:id       - Get user by student ID"
    );
    console.log("\n");

    // Example usage (uncomment when you have authToken):
    /*
    // Test 1: Check availability
    console.log('1️⃣ Testing student ID availability check...');
    const availabilityResponse = await axios.get(
      `${BASE_URL}/api/user/student-id/check/${testStudentId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Availability check:', availabilityResponse.data);

    // Test 2: Update student ID
    console.log('2️⃣ Testing student ID update...');
    const updateResponse = await axios.put(
      `${BASE_URL}/api/user/student-id`,
      { studentId: testStudentId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Update response:', updateResponse.data);

    // Test 3: Get student ID
    console.log('3️⃣ Testing get student ID...');
    const getResponse = await axios.get(
      `${BASE_URL}/api/user/student-id`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Get response:', getResponse.data);

    // Test 4: Get user by student ID
    console.log('4️⃣ Testing get user by student ID...');
    const getUserResponse = await axios.get(
      `${BASE_URL}/api/user/by-student-id/${testStudentId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Get user response:', getUserResponse.data);

    // Test 5: Delete student ID
    console.log('5️⃣ Testing student ID deletion...');
    const deleteResponse = await axios.delete(
      `${BASE_URL}/api/user/student-id`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Delete response:', deleteResponse.data);
    */
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
