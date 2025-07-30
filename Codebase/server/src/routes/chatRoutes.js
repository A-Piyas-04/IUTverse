const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// All chat routes require authentication
router.use(authMiddleware);

// Start or get conversation with another user
router.post("/conversations", chatController.startConversation);

// Get user's conversations
router.get("/conversations", chatController.getConversations);

// Send a message
router.post("/messages", chatController.sendMessage);

// Get messages in a conversation
router.get(
  "/conversations/:conversationId/messages",
  chatController.getMessages
);

// Mark messages as read
router.put("/conversations/:conversationId/read", chatController.markAsRead);

module.exports = router;
