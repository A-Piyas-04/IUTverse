const chatService = require("../services/chatService");
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { pagination, positiveInt, requiredText, uuid } = require("../utils/validation");
const multer = require("multer");
const storageService = require("../services/storageService");
const attachmentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Start or get conversation with another user
const startConversation = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user.userId;

    const otherUserResult = uuid(otherUserId, "Other user ID");
    if (otherUserResult.error) return response.badRequest(res, otherUserResult.error);

    if (otherUserId === userId) {
      return response.badRequest(res, "Cannot start conversation with yourself");
    }

    const conversation = await chatService.getOrCreateConversation(
      userId,
      otherUserId
    );

    res.status(200).json({
      success: true,
      message: "Conversation ready",
      conversation,
      data: conversation,
    });
  } catch (error) {
    logger.error("Error starting conversation:", error);
    response.serverError(res, "Failed to start conversation", error.message);
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.user.userId;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (conversationIdResult.error) return response.badRequest(res, conversationIdResult.error);

    const contentResult = content ? requiredText(content, "Message content", { max: 4000 }) : { value: "" };
    if (contentResult.error || (!contentResult.value && !req.file)) return response.badRequest(res, contentResult.error || "Message or attachment is required");

    let attachment = null;
    if (req.file) {
      const uploaded = await storageService.uploadObject({ bucket: "chat-attachments", userId: senderId, file: req.file, prefix: "message" });
      attachment = { path: uploaded.path, bucket: uploaded.bucket, name: req.file.originalname, mimeType: uploaded.mimeType, size: uploaded.size };
    }

    const message = await chatService.sendMessage(
      conversationIdResult.value,
      senderId,
      receiverId,
      contentResult.value,
      attachment
    );

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    logger.error("Error sending message:", error);
    if (error.message === "Conversation not found or access denied") {
      return response.forbidden(res, error.message);
    }
    response.serverError(res, "Failed to send message", error.message);
  }
};

// Get messages in a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (conversationIdResult.error) return response.badRequest(res, conversationIdResult.error);

    const messages = await chatService.getMessages(
      conversationIdResult.value,
      userId,
      page,
      limit
    );

    res.status(200).json({
      message: "Messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    logger.error("Error getting messages:", error);
    if (error.message === "Conversation not found or access denied") {
      return response.forbidden(res, error.message);
    }
    response.serverError(res, "Failed to get messages", error.message);
  }
};

// Get user's conversations
const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pageInfo = pagination(req.query.page, req.query.limit, 50);

    const result = await chatService.getUserConversations(userId, pageInfo);

    res.status(200).json({
      message: "Conversations retrieved successfully",
      data: result.conversations,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error("Error getting conversations:", error);
    response.serverError(res, "Failed to get conversations", error.message);
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (conversationIdResult.error) return response.badRequest(res, conversationIdResult.error);

    await chatService.markMessagesAsRead(conversationIdResult.value, userId);

    res.status(200).json({
      message: "Messages marked as read",
    });
  } catch (error) {
    logger.error("Error marking messages as read:", error);
    response.serverError(res, "Failed to mark messages as read", error.message);
  }
};

const getAttachment = async (req, res) => {
  try {
    const message = await chatService.getAttachment(req.params.messageId, req.user.userId);
    const url = await storageService.signedUrl(message.attachment_bucket, message.attachment_path, 300);
    return res.redirect(url);
  } catch (error) {
    if (error.message.includes("access denied")) return response.forbidden(res, error.message);
    if (error.message.includes("not found")) return response.notFound(res, error.message);
    return response.serverError(res, "Could not open attachment", error.message);
  }
};

module.exports = {
  startConversation,
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  attachmentUpload,
  getAttachment,
};
