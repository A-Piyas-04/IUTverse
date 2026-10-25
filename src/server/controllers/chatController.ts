import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import { json, redirect } from "../http/responses";
import chatService from "../services/chatService";
import type { Attachment, Gif } from "../services/chatService";
import { isGifUrl, searchGifs } from "../services/gifService";
import * as storageService from "../services/storageService";
import { PublicError } from "../http/errors";
import logger from "../utils/logger";
import { ensureSupabaseAdmin } from "../utils/supabaseData";
import { optionalText, pagination, positiveInt, requiredText, uuid } from "../utils/validation";

// Form fields arrive as strings (multipart) or numbers (JSON).
const boundedInt = (value: unknown, label: string, min: number, max: number) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new PublicError(`${label} must be a whole number from ${min} to ${max}`);
  return number;
};

// Voice-message loudness bars: up to 64 values from 0 to 100.
const waveform = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  let list: unknown = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      throw new PublicError("Waveform must be a list of numbers");
    }
  }
  if (!Array.isArray(list) || list.length > 64 || !list.every((bar) => Number.isInteger(bar) && bar >= 0 && bar <= 100)) {
    throw new PublicError("Waveform must be up to 64 whole numbers from 0 to 100");
  }
  return list as number[];
};

const gifFrom = (body: Record<string, any>): Gif | null => {
  if (!body.gifUrl) return null;
  if (!isGifUrl(body.gifUrl)) throw new PublicError("GIFs must come from the GIF picker");
  return {
    url: body.gifUrl,
    width: boundedInt(body.gifWidth, "GIF width", 1, 4000) ?? 1,
    height: boundedInt(body.gifHeight, "GIF height", 1, 4000) ?? 1,
  };
};

// Only posts everyone can currently see may be shared.
const ensureShareablePost = async (postId: number) => {
  const { data, error } = await ensureSupabaseAdmin().from("posts").select("id, status").eq("id", postId).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active") throw new PublicError("Post not found", 404);
};

const MAX_SHARE_RECIPIENTS = 15;
// A single emoji: pictographs plus the joiners, skin tones and variation
// selectors (all Emoji_Component) that build one.
const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u;
const PICTOGRAPH = /\p{Extended_Pictographic}/u;

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

// Send a message: text, with at most one of an attachment (photo, video,
// voice message, file), a GIF or a shared post.
export const sendMessage: Handler = async (ctx) => {
  try {
    const { conversationId, content } = ctx.body;
    const senderId = ctx.user!.userId;

    const conversationIdResult = positiveInt(conversationId, "Conversation ID");
    if (!conversationIdResult.ok) return response.badRequest(conversationIdResult.error);

    const contentResult = content ? requiredText(content, "Message content", { max: 4000 }) : ({ ok: true, value: "" } as const);
    if (!contentResult.ok) return response.badRequest(contentResult.error);

    const gif = gifFrom(ctx.body);
    const sharedPostId = ctx.body.sharedPostId ? positiveInt(ctx.body.sharedPostId, "Post ID") : null;
    if (sharedPostId && !sharedPostId.ok) return response.badRequest(sharedPostId.error);
    const payloads = [ctx.file, gif, sharedPostId].filter(Boolean).length;
    if (payloads > 1) return response.badRequest("Send one attachment, GIF or post at a time");
    if (!contentResult.value && !payloads) return response.badRequest("Message or attachment is required");

    // Check access before uploading so non-participants cannot fill storage.
    if (!(await chatService.isParticipant(conversationIdResult.value, senderId))) {
      return response.forbidden("Conversation not found or access denied");
    }
    if (sharedPostId?.ok) await ensureShareablePost(sharedPostId.value);

    let attachment: Attachment | null = null;
    if (ctx.file) {
      const uploaded = await storageService.uploadObject({ bucket: "chat-attachments", userId: senderId, file: ctx.file, prefix: "message" });
      attachment = {
        path: uploaded.path,
        bucket: uploaded.bucket,
        name: ctx.file.originalname,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        width: boundedInt(ctx.body.attachmentWidth, "Width", 1, 20000),
        height: boundedInt(ctx.body.attachmentHeight, "Height", 1, 20000),
        durationMs: boundedInt(ctx.body.attachmentDurationMs, "Duration", 0, 3600000),
        waveform: String(uploaded.mimeType).startsWith("audio/") ? waveform(ctx.body.attachmentWaveform) : null,
      };
    }

    const message = await chatService.sendMessage(conversationIdResult.value, senderId, {
      content: contentResult.value,
      attachment,
      gif,
      sharedPostId: sharedPostId?.ok ? sharedPostId.value : null,
    });

    return json(201, { message: "Message sent successfully", data: message });
  } catch (error: any) {
    if (error instanceof PublicError) throw error;
    logger.error("Error sending message:", error);
    if (error.message === "Conversation not found or access denied") {
      return response.forbidden(error.message);
    }
    return response.serverError("Failed to send message", error.message);
  }
};

// Change a message's text: its sender only, within 10 minutes of sending.
export const editMessage: Handler = async (ctx) => {
  const id = positiveInt(ctx.params.messageId, "Message ID");
  if (!id.ok) return response.badRequest(id.error);
  const message = await chatService.editMessage(id.value, ctx.user!.userId, optionalText(ctx.body.content, { max: 4000 }) ?? "");
  return response.success(message, "Message edited");
};

// One emoji reaction per member per message; the same emoji again removes it.
export const reactToMessage: Handler = async (ctx) => {
  const id = positiveInt(ctx.params.messageId, "Message ID");
  if (!id.ok) return response.badRequest(id.error);
  const emoji = typeof ctx.body.emoji === "string" ? ctx.body.emoji.trim() : "";
  if (!emoji || [...emoji].length > 8 || !EMOJI.test(emoji) || !PICTOGRAPH.test(emoji)) {
    return response.badRequest("Reaction must be a single emoji");
  }
  return response.success(await chatService.toggleReaction(id.value, ctx.user!.userId, emoji), "Reaction updated");
};

// The member's app has received their new messages: the sender sees two ticks.
export const markDelivered: Handler = async (ctx) => response.success(await chatService.markDelivered(ctx.user!.userId));

// GIF picker: trending without a query, search results with one.
export const gifs: Handler = async (ctx) => {
  const query = optionalText(ctx.query.q, { max: 80 }) ?? "";
  const page = boundedInt(ctx.query.page || 1, "Page", 1, 50) ?? 1;
  return response.success(await searchGifs({ query, page, userId: ctx.user!.userId }));
};

// Share a post into chats: to members (starting a direct chat if needed) or to
// existing conversations, with an optional note.
export const sharePost: Handler = async (ctx) => {
  const userId = ctx.user!.userId;
  const postId = positiveInt(ctx.body.postId, "Post ID");
  if (!postId.ok) return response.badRequest(postId.error);
  const note = optionalText(ctx.body.message, { max: 1000 }) ?? "";
  const userIds: unknown[] = Array.isArray(ctx.body.userIds) ? ctx.body.userIds : [];
  const conversationIds: unknown[] = Array.isArray(ctx.body.conversationIds) ? ctx.body.conversationIds : [];
  if (!userIds.length && !conversationIds.length) return response.badRequest("Choose who to send the post to");
  if (userIds.length + conversationIds.length > MAX_SHARE_RECIPIENTS) {
    return response.badRequest(`A post can be sent to at most ${MAX_SHARE_RECIPIENTS} chats at once`);
  }
  for (const id of userIds) {
    const checked = uuid(id, "Member ID");
    if (!checked.ok) return response.badRequest(checked.error);
    if (id === userId) return response.badRequest("Cannot send a post to yourself");
  }
  await ensureShareablePost(postId.value);

  const targets = new Set<number>();
  for (const raw of conversationIds) {
    const id = positiveInt(raw, "Conversation ID");
    if (!id.ok) return response.badRequest(id.error);
    if (!(await chatService.isParticipant(id.value, userId))) return response.forbidden("Conversation not found or access denied");
    targets.add(id.value);
  }
  for (const otherId of new Set(userIds as string[])) {
    const conversation = await chatService.getOrCreateConversation(userId, otherId);
    if (conversation) targets.add(Number(conversation.id));
  }
  for (const conversationId of targets) {
    await chatService.sendMessage(conversationId, userId, { content: note, sharedPostId: postId.value });
  }
  return json(201, { success: true, message: "Post shared", data: { sent: targets.size, conversationIds: [...targets] } });
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

const conversationParam = (ctx: Parameters<Handler>[0]) => {
  const id = positiveInt(ctx.params.conversationId, "Conversation ID");
  if (!id.ok) throw new PublicError(id.error);
  return id.value;
};

// Mute, mark as unread and nicknames, all optional in one request.
export const updateConversationSettings: Handler = async (ctx) => {
  const conversationId = conversationParam(ctx);
  const change: Parameters<typeof chatService.updateSettings>[2] = {};
  if (ctx.body.mute !== undefined) change.mute = String(ctx.body.mute);
  if (ctx.body.markedUnread !== undefined) {
    if (typeof ctx.body.markedUnread !== "boolean") return response.badRequest("markedUnread must be true or false");
    change.markedUnread = ctx.body.markedUnread;
  }
  if (ctx.body.nickname !== undefined) {
    const target = uuid(ctx.body.nickname?.userId, "Member ID");
    if (!target.ok) return response.badRequest(target.error);
    change.nickname = { userId: target.value, value: optionalText(ctx.body.nickname?.value, { max: 40 }) };
  }
  if (!Object.keys(change).length) return response.badRequest("Nothing to change");
  return response.success(await chatService.updateSettings(conversationId, ctx.user!.userId, change), "Chat updated");
};

// "Delete chat": hides the conversation so far for this member only.
export const clearConversation: Handler = async (ctx) =>
  response.success(await chatService.clearConversation(conversationParam(ctx), ctx.user!.userId), "Chat deleted");

export const searchConversation: Handler = async (ctx) => {
  const query = optionalText(ctx.query.q, { max: 100 }) ?? "";
  if (query.length < 2) return response.badRequest("Type at least two characters to search");
  return response.success(await chatService.searchMessages(conversationParam(ctx), ctx.user!.userId, query));
};

export const conversationMedia: Handler = async (ctx) => {
  const type = String(ctx.query.type || "media");
  if (!["media", "files", "links"].includes(type)) return response.badRequest("type must be media, files or links");
  const page = boundedInt(ctx.query.page || 1, "Page", 1, 1000) ?? 1;
  return response.success(await chatService.listMedia(conversationParam(ctx), ctx.user!.userId, type as "media" | "files" | "links", page));
};

const blockTarget = (ctx: Parameters<Handler>[0]) => {
  const target = uuid(ctx.params.userId, "Member ID");
  if (!target.ok) throw new PublicError(target.error);
  return target.value;
};

export const blockUser: Handler = async (ctx) => response.success(await chatService.block(ctx.user!.userId, blockTarget(ctx)), "Blocked");
export const unblockUser: Handler = async (ctx) => response.success(await chatService.unblock(ctx.user!.userId, blockTarget(ctx)), "Unblocked");
