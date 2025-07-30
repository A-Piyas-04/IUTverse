const chatService = require("../services/chatService");

// Start or get conversation with another user
const startConversation = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user.userId;

    if (!otherUserId) {
      return res.status(400).json({ message: "Other user ID is required" });
    }

    if (otherUserId === userId) {
      return res
        .status(400)
        .json({ message: "Cannot start conversation with yourself" });
    }

    const conversation = await chatService.getOrCreateConversation(
      userId,
      otherUserId
    );

    res.status(200).json({
      message: "Conversation ready",
      conversation,
    });
  } catch (error) {
    console.error("Error starting conversation:", error);
    res.status(500).json({ message: "Failed to start conversation" });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.user.userId;

    if (!conversationId || !receiverId || !content) {
      return res.status(400).json({
        message: "Conversation ID, receiver ID, and content are required",
      });
    }

    if (content.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty" });
    }

    const message = await chatService.sendMessage(
      conversationId,
      senderId,
      receiverId,
      content.trim()
    );

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    if (error.message === "Conversation not found or access denied") {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Get messages in a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
    }

    const messages = await chatService.getMessages(
      parseInt(conversationId),
      userId,
      page,
      limit
    );

    res.status(200).json({
      message: "Messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    if (error.message === "Conversation not found or access denied") {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to get messages" });
  }
};

// Get user's conversations
const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await chatService.getUserConversations(userId);

    res.status(200).json({
      message: "Conversations retrieved successfully",
      data: conversations,
    });
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ message: "Failed to get conversations" });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
    }

    await chatService.markMessagesAsRead(parseInt(conversationId), userId);

    res.status(200).json({
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};

module.exports = {
  startConversation,
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
};
