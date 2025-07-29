// Test script for Confession API
// Run this with: node test-confession-api.js

const axios = require("axios");

const BASE_URL = "http://localhost:3000/api"; // Adjust based on your server port
let authToken = ""; // You'll need to get this from login

// Helper function to make authenticated requests
const authAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
});

async function testConfessionAPI() {
  console.log("🧪 Testing Confession API...\n");

  try {
    // 1. Test getting all confessions (public)
    console.log("1. Testing GET /confessions");
    const confessions = await axios.get(`${BASE_URL}/confessions?limit=5`);
    console.log(`✅ Found ${confessions.data.length} confessions\n`);

    // 2. Test getting analytics (public)
    console.log("2. Testing GET /confessions/analytics");
    const analytics = await axios.get(`${BASE_URL}/confessions/analytics`);
    console.log(
      `✅ Analytics: ${analytics.data.totalConfessions} total confessions\n`
    );

    // 3. Test getting random confession (public)
    console.log("3. Testing GET /confessions/random");
    const randomConfession = await axios.get(`${BASE_URL}/confessions/random`);
    console.log(
      `✅ Got random confession: "${randomConfession.data.content.substring(
        0,
        50
      )}..."\n`
    );

    // The following tests require authentication
    if (!authToken) {
      console.log("⚠️ Skipping authenticated tests - no auth token provided");
      console.log(
        "To test authenticated endpoints, set authToken variable at the top of this file\n"
      );
      return;
    }

    // 4. Test creating a confession
    console.log("4. Testing POST /confessions");
    const newConfession = await authAxios.post("/confessions", {
      content: "This is a test confession from the API test script.",
      tag: "Academic Stress",
      poll: {
        question: "How useful are API tests?",
        options: [
          { text: "Very useful" },
          { text: "Somewhat useful" },
          { text: "Not useful" },
        ],
      },
    });
    console.log(`✅ Created confession with ID: ${newConfession.data.id}\n`);

    const confessionId = newConfession.data.id;
    const pollId = newConfession.data.poll?.id;

    // 5. Test adding a reaction
    console.log("5. Testing POST /confessions/:id/reactions");
    const reactionResult = await authAxios.post(
      `/confessions/${confessionId}/reactions`,
      {
        reactionType: "like",
      }
    );
    console.log(
      `✅ Added reaction, total likes: ${reactionResult.data.reactions.like}\n`
    );

    // 6. Test getting user reactions
    console.log("6. Testing GET /confessions/:id/user-reactions");
    const userReactions = await authAxios.get(
      `/confessions/${confessionId}/user-reactions`
    );
    console.log(
      `✅ User reactions: ${userReactions.data.reactionTypes.join(", ")}\n`
    );

    // 7. Test voting on poll (if poll exists)
    if (pollId && newConfession.data.poll?.options?.length > 0) {
      console.log("7. Testing POST /confessions/:id/polls/:pollId/vote");
      const optionId = newConfession.data.poll.options[0].id;
      const voteResult = await authAxios.post(
        `/confessions/${confessionId}/polls/${pollId}/vote`,
        {
          optionId: optionId,
        }
      );
      console.log(
        `✅ Voted on poll, total votes: ${voteResult.data.poll.totalVotes}\n`
      );

      // 8. Test checking vote status
      console.log("8. Testing GET /confessions/polls/:pollId/user-voted");
      const voteStatus = await authAxios.get(
        `/confessions/polls/${pollId}/user-voted`
      );
      console.log(`✅ User vote status: ${voteStatus.data.hasVoted}\n`);
    }

    // 9. Test removing reaction
    console.log("9. Testing DELETE /confessions/:id/reactions");
    const removeReactionResult = await authAxios.delete(
      `/confessions/${confessionId}/reactions`,
      {
        data: { reactionType: "like" },
      }
    );
    console.log(
      `✅ Removed reaction, total likes: ${removeReactionResult.data.reactions.like}\n`
    );

    console.log("🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

// Error handling test scenarios
async function testErrorScenarios() {
  console.log("\n🔍 Testing Error Scenarios...\n");

  try {
    // Test invalid confession data
    console.log("1. Testing invalid confession data");
    try {
      await authAxios.post("/confessions", {
        content: "", // Empty content
        tag: "Invalid Tag",
      });
    } catch (error) {
      console.log(
        `✅ Correctly rejected invalid data: ${error.response.data.message}\n`
      );
    }

    // Test invalid reaction type
    console.log("2. Testing invalid reaction type");
    try {
      await authAxios.post("/confessions/1/reactions", {
        reactionType: "invalid",
      });
    } catch (error) {
      console.log(
        `✅ Correctly rejected invalid reaction: ${error.response.data.message}\n`
      );
    }

    // Test invalid ID parameter
    console.log("3. Testing invalid ID parameter");
    try {
      await axios.get(`${BASE_URL}/confessions/invalid-id`);
    } catch (error) {
      console.log(
        `✅ Correctly rejected invalid ID: ${error.response.data.message}\n`
      );
    }

    console.log("🎉 Error scenario tests completed!");
  } catch (error) {
    console.error("❌ Error scenario test failed:", error.message);
  }
}

// Run tests
async function runAllTests() {
  await testConfessionAPI();
  await testErrorScenarios();
}

// Usage examples for copy-paste
function showUsageExamples() {
  console.log("\n📝 Usage Examples:\n");

  console.log("// Fetch confessions with filtering");
  console.log(
    "GET /api/confessions?tag=Academic%20Stress&sortBy=recent&page=1&limit=10\n"
  );

  console.log("// Create a confession");
  console.log(`POST /api/confessions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "content": "Your confession content here...",
  "tag": "Academic Stress",
  "poll": {
    "question": "Optional poll question?",
    "options": [
      { "text": "Option 1" },
      { "text": "Option 2" }
    ]
  }
}\n`);

  console.log("// Add a reaction");
  console.log(`POST /api/confessions/123/reactions
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "reactionType": "like"
}\n`);

  console.log("// Vote on a poll");
  console.log(`POST /api/confessions/123/polls/456/vote
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "optionId": 789
}\n`);
}

// Uncomment to run tests
// runAllTests();

// Show usage examples
showUsageExamples();

module.exports = { testConfessionAPI, testErrorScenarios };
