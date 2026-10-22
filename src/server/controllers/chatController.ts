import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json, redirect } from "../http/responses";
import chatService from "../services/chatService";
import type { Attachment } from "../services/chatService";
import * as storageService from "../services/storageService";
import logger from "../utils/logger";
import { pagination, positiveInt, requiredText, uuid } from "../utils/validation";

// Start or get conversation with another user
export const startConversation: Handler = async (ctx) => {
  try {
    const { otherUserId } = ctx.body;
    const userId = ctx.user!.userId;

    const otherUserResult = uuid(otherUserId, "Other user ID");
    if (!otherUserResult.ok) return response.badRequest(otherUserResult.error);

    if (otherUserId === userId) {
      return response.badRequest("Cannot start conversation with yourself");
    }

    const conversation = await chatService.getOrCreateConversation(userId, otherUserId);

    return json(200, {
      success: true,
      message: "Conversation ready",
      conversation,
      data: conversation,
    });
  } catch (error: any) {
    logger.error("Error starting conversation:", error);
    return response.serverError("Failed to start conversation", error.message);
  }
};

// Send a message
export const sendMessage: Handler = async (ctx) => {
  try {
    const { conversationId, receiverId, content } = ctx.body;
    const senderId = ctx.user!.userId;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (!conversationIdResult.ok) return response.badRequest(conversationIdResult.error);

    const contentResult = content ? requiredText(content, "Message content", { max: 4000 }) : ({ ok: true, value: "" } as const);
    if (!contentResult.ok) return response.badRequest(contentResult.error);
    if (!contentResult.value && !ctx.file) return response.badRequest("Message or attachment is required");

    // Check access before uploading so non-participants cannot fill storage.
    if (!(await chatService.isParticipant(conversationIdResult.value, senderId))) {
      return response.forbidden("Conversation not found or access denied");
    }

    let attachment: Attachment | null = null;
    if (ctx.file) {
      const uploaded = await storageService.uploadObject({ bucket: "chat-attachments", userId: senderId, file: ctx.file, prefix: "message" });
      attachment = { path: uploaded.path, bucket: uploaded.bucket, name: ctx.file.originalname, mimeType: uploaded.mimeType, size: uploaded.size };
    }

    const message = await chatService.sendMessage(
      conversationIdResult.value,
      senderId,
      receiverId,
      contentResult.value,
      attachment
    );

    return json(201, { message: "Message sent successfully", data: message });
  } catch (error: any) {
    logger.error("Error sending message:", error);
    if (error.message === "Conversation not found or access denied") {
      return response.forbidden(error.message);
    }
    return response.serverError("Failed to send message", error.message);
  }
};

// Get messages in a conversation
export const getMessages: Handler = async (ctx) => {
  try {
    const { conversationId } = ctx.params;
    const userId = ctx.user!.userId;
    const page = parseInt(String(ctx.query.page)) || 1;
    const limit = parseInt(String(ctx.query.limit)) || 50;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (!conversationIdResult.ok) return response.badRequest(conversationIdResult.error);

    const messages = await chatService.getMessages(conversationIdResult.value, userId, page, limit);

    return json(200, { message: "Messages retrieved successfully", data: messages });
  } catch (error: any) {
    logger.error("Error getting messages:", error);
    if (error.message === "Conversation not found or access denied") {
      return response.forbidden(error.message);
    }
    return response.serverError("Failed to get messages", error.message);
  }
};

// Get user's conversations
export const getConversations: Handler = async (ctx) => {
  try {
    const userId = ctx.user!.userId;
    const pageInfo = pagination(ctx.query.page, ctx.query.limit, 50);

    const result = await chatService.getUserConversations(userId, pageInfo);

    return json(200, {
      message: "Conversations retrieved successfully",
      data: result.conversations,
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error("Error getting conversations:", error);
    return response.serverError("Failed to get conversations", error.message);
  }
};

// Mark messages as read
export const markAsRead: Handler = async (ctx) => {
  try {
    const { conversationId } = ctx.params;
    const userId = ctx.user!.userId;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (!conversationIdResult.ok) return response.badRequest(conversationIdResult.error);

    await chatService.markMessagesAsRead(conversationIdResult.value, userId);

    return json(200, { message: "Messages marked as read" });
  } catch (error: any) {
    logger.error("Error marking messages as read:", error);
    return response.serverError("Failed to mark messages as read", error.message);
  }
};

export const getAttachment: Handler = async (ctx) => {
  try {
    const message = await chatService.getAttachment(ctx.params.messageId, ctx.user!.userId);
    const url = await storageService.signedUrl(message.attachment_bucket, message.attachment_path, 300);
    return redirect(url as string);
  } catch (error: any) {
    if (error.message.includes("access denied")) return response.forbidden(error.message);
    if (error.message.includes("not found")) return response.notFound(error.message);
    return response.serverError("Could not open attachment", error.message);
  }
};
