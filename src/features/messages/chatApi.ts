import { apiRequest, jsonBody } from "@/lib/api";
import { uploadDirect } from "@/lib/uploads";
import type { Conversation, Message } from "@/lib/types";

/** A file the member picked or recorded, with what the server stores alongside it. */
export interface MediaDraft {
  file: File;
  kind: "image" | "video" | "file" | "audio";
  /** Local preview while it uploads. */
  previewUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  waveform?: number[];
}

export interface GifChoice {
  id: string;
  title: string;
  preview: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
}

export interface OutgoingChatMessage {
  content?: string;
  media?: MediaDraft | null;
  gif?: GifChoice["full"] | null;
  sharedPostId?: number | null;
}

/** Uploads any media straight to Storage first, then posts the message. */
export async function sendChatMessage(conversationId: number, { content = "", media, gif, sharedPostId }: OutgoingChatMessage) {
  const body = new FormData();
  body.append("conversationId", String(conversationId));
  if (content.trim()) body.append("content", content.trim());
  if (media) {
    body.append("uploadPath", await uploadDirect("chat", media.file, { conversationId }));
    body.append("attachmentName", media.file.name);
    if (media.width) body.append("attachmentWidth", String(Math.round(media.width)));
    if (media.height) body.append("attachmentHeight", String(Math.round(media.height)));
    if (media.durationMs) body.append("attachmentDurationMs", String(Math.round(media.durationMs)));
    if (media.waveform?.length) body.append("attachmentWaveform", JSON.stringify(media.waveform));
  }
  if (gif) {
    body.append("gifUrl", gif.url);
    body.append("gifWidth", String(gif.width));
    body.append("gifHeight", String(gif.height));
  }
  if (sharedPostId) body.append("sharedPostId", String(sharedPostId));
  return apiRequest<Message>("/chat/messages", { method: "POST", body });
}

export const editChatMessage = (messageId: number, content: string) =>
  apiRequest<Message>(`/chat/messages/${messageId}`, { method: "PATCH", ...jsonBody({ content }) });

export const reactToChatMessage = (messageId: number, emoji: string) =>
  apiRequest<Message>(`/chat/messages/${messageId}/reactions`, { method: "POST", ...jsonBody({ emoji }) });

export const markConversationRead = (conversationId: number) => apiRequest(`/chat/conversations/${conversationId}/read`, { method: "PUT" });

export const markMessagesDelivered = () => apiRequest<{ updated: number }>("/chat/delivered", { method: "POST" });

export const searchGifs = (query: string, page: number, signal?: AbortSignal) =>
  apiRequest<{ gifs: GifChoice[]; hasNext: boolean; page: number }>(`/chat/gifs?${new URLSearchParams({ q: query, page: String(page) })}`, {}, signal);

export const sharePostToChats = (postId: number, recipients: { userIds?: string[]; conversationIds?: number[]; message?: string }) =>
  apiRequest<{ sent: number; conversationIds: number[] }>("/chat/share", { method: "POST", ...jsonBody({ postId, ...recipients }) });

/** Reads a photo's or video's size (and a video's length) so the bubble has its shape before it loads. */
export function measureMedia(file: File, kind: "image" | "video"): Promise<{ width?: number; height?: number; durationMs?: number }> {
  const url = URL.createObjectURL(file);
  return new Promise<{ width?: number; height?: number; durationMs?: number }>((resolve) => {
    const done = (value: { width?: number; height?: number; durationMs?: number }) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    if (kind === "image") {
      const image = new Image();
      image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => done({});
      image.src = url;
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => done({ width: video.videoWidth || undefined, height: video.videoHeight || undefined, durationMs: Number.isFinite(video.duration) ? video.duration * 1000 : undefined });
    video.onerror = () => done({});
    video.src = url;
  });
}

export type MuteOption = "1h" | "8h" | "24h" | "forever" | "off";

export const updateChatSettings = (conversationId: number, change: { mute?: MuteOption; markedUnread?: boolean; nickname?: { userId: string; value: string | null } }) =>
  apiRequest<Conversation>(`/chat/conversations/${conversationId}/settings`, { method: "PATCH", ...jsonBody(change) });

export const clearChat = (conversationId: number) => apiRequest(`/chat/conversations/${conversationId}/clear`, { method: "POST" });

export const setBlocked = (userId: string, blocked: boolean) => apiRequest(`/chat/blocks/${userId}`, { method: blocked ? "POST" : "DELETE" });

export const searchChat = (conversationId: number, query: string, signal?: AbortSignal) =>
  apiRequest<Message[]>(`/chat/conversations/${conversationId}/search?${new URLSearchParams({ q: query })}`, {}, signal);

export const chatMedia = (conversationId: number, type: "media" | "files" | "links", page: number, signal?: AbortSignal) =>
  apiRequest<Message[]>(`/chat/conversations/${conversationId}/media?${new URLSearchParams({ type, page: String(page) })}`, {}, signal);
