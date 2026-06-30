const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticateToken } = require("../middleware/auth");
const { createLimiter } = require("../middleware/security");

// All chat routes require authentication
router.use(authenticateToken);

// Start or get conversation with another user
router.post("/conversations", createLimiter, chatController.startConversation);

// Get user's conversations
router.get("/conversations", chatController.getConversations);

// Send a message
router.post("/messages", createLimiter, chatController.attachmentUpload.single("attachment"), chatController.sendMessage);

// Get messages in a conversation
router.get(
  "/conversations/:conversationId/messages",
  chatController.getMessages
);

// Mark messages as read
router.put("/conversations/:conversationId/read", chatController.markAsRead);
router.get("/attachments/:messageId", chatController.getAttachment);

module.exports = router;
