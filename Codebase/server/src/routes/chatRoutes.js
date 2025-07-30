const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const chatController = require("../controllers/chatController");

// Get all conversations for the current user
router.get(
  "/conversations",
  authenticateToken,
  chatController.getUserConversations
);

// Create or get existing conversation with another user
router.post(
  "/conversations",
  authenticateToken,
  chatController.createOrGetConversation
);

// Get messages in a specific conversation
router.get(
  "/conversations/:conversationId/messages",
  authenticateToken,
  chatController.getConversationMessages
);

// Send a new message
router.post("/conversations/:conversationId/messages", authenticateToken, chatController.sendMessage);

// Legacy route for sending messages (keeping for backward compatibility)
router.post("/messages", authenticateToken, chatController.sendMessage);

// Mark messages as read
router.put(
  "/messages/:messageId/read",
  authenticateToken,
  chatController.markMessageAsRead
);

// Mark all messages in a conversation as read
router.put(
  "/conversations/:conversationId/read",
  authenticateToken,
  chatController.markConversationAsRead
);

// Delete a message (optional feature)
router.delete(
  "/messages/:messageId",
  authenticateToken,
  chatController.deleteMessage
);

// Get unread message count
router.get("/unread-count", authenticateToken, chatController.getUnreadCount);

module.exports = router;
