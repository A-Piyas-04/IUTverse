import type { Message } from "@/lib/types";

/** How long the sender may edit a message. The API enforces the same window. */
export const EDIT_WINDOW_MS = 10 * 60 * 1000;
const EDITABLE_KINDS = new Set(["text", "image", "video", "file"]);

export type DeliveryStatus = "sent" | "delivered" | "read";

/** The ticks on a message the member sent, like WhatsApp: one, two grey, two coloured. */
export const deliveryStatus = (message: Pick<Message, "deliveredAt" | "readAt">): DeliveryStatus =>
  message.readAt ? "read" : message.deliveredAt ? "delivered" : "sent";

export const canEditMessage = (message: Message, userId: string | undefined, now = Date.now()) =>
  Boolean(userId) &&
  message.senderId === userId &&
  EDITABLE_KINDS.has(message.kind || "text") &&
  now - new Date(message.sentAt).getTime() < EDIT_WINDOW_MS;

const KIND_PREVIEW: Record<string, string> = {
  image: "📷 Photo",
  video: "🎥 Video",
  audio: "🎤 Voice message",
  file: "📄 File",
  gif: "GIF",
  post: "📝 Shared a post",
};

/** One line for conversation lists: "You: 📷 Photo", "Voice message (0:12)", or the text. */
export function messagePreview(message: Message | null | undefined, userId?: string) {
  if (!message) return "Start the conversation";
  const kind = message.kind || (message.attachmentUrl ? "file" : "text");
  let text = message.content?.trim() || "";
  if (kind !== "text") {
    const label = kind === "audio" && message.attachment?.durationMs ? `${KIND_PREVIEW.audio} (${formatDuration(message.attachment.durationMs)})` : KIND_PREVIEW[kind];
    text = text && kind !== "audio" ? `${label} · ${text}` : label;
  }
  return message.senderId === userId ? `You: ${text}` : text;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
  userIds: string[];
}

/** Reactions grouped by emoji, most used first; ties keep first-used order. */
export function groupReactions(reactions: Message["reactions"] = [], userId?: string): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const reaction of reactions) {
    const group = groups.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, mine: false, userIds: [] };
    group.count += 1;
    group.userIds.push(reaction.userId);
    if (reaction.userId === userId) group.mine = true;
    groups.set(reaction.emoji, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export const formatDuration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** "Today", "Yesterday", or a date, for the separators between days. */
export function dayLabel(value: string, now = new Date()) {
  const date = new Date(value);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: days < 7 ? "long" : undefined, month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export const timeLabel = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const MB = 1024 * 1024;
// Must match UPLOAD_PURPOSES.chat on the server.
const CHAT_FILE_RULES: Record<string, { kind: "image" | "video" | "file"; maxBytes: number }> = {
  "image/jpeg": { kind: "image", maxBytes: 10 * MB },
  "image/png": { kind: "image", maxBytes: 10 * MB },
  "image/webp": { kind: "image", maxBytes: 10 * MB },
  "image/gif": { kind: "image", maxBytes: 10 * MB },
  "video/mp4": { kind: "video", maxBytes: 50 * MB },
  "video/webm": { kind: "video", maxBytes: 50 * MB },
  "video/quicktime": { kind: "video", maxBytes: 50 * MB },
  "application/pdf": { kind: "file", maxBytes: 10 * MB },
};
export const CHAT_FILE_ACCEPT = Object.keys(CHAT_FILE_RULES).join(",");

/** Which kind of chat attachment a picked file is, or why it cannot be sent. */
export function classifyChatFile(file: Pick<File, "type" | "size">): { kind: "image" | "video" | "file"; error?: undefined } | { kind?: undefined; error: string } {
  const rule = CHAT_FILE_RULES[file.type];
  if (!rule) return { error: "Send photos (JPEG, PNG, WebP, GIF), videos (MP4, WebM, MOV) or PDFs." };
  if (file.size > rule.maxBytes) return { error: `${rule.kind === "video" ? "Videos" : "Files"} can be up to ${rule.maxBytes / MB} MB.` };
  return { kind: rule.kind };
}

// Recorder formats in order of preference: Chrome, Edge and Firefox record
// WebM/Opus, Safari records MP4/AAC. The upload type drops the codec part.
const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
export const pickRecorderType = (isSupported: (type: string) => boolean) => RECORDER_TYPES.find(isSupported) || null;
export const baseMimeType = (type: string) => type.split(";")[0].trim().toLowerCase();
export const AUDIO_EXTENSION: Record<string, string> = { "audio/webm": "weba", "audio/mp4": "m4a", "audio/ogg": "ogg" };

/** Averages loudness samples (0-1) into `bars` values from 0 to 100 for the voice player. */
export function waveformBars(samples: number[], bars = 40) {
  if (!samples.length) return Array.from({ length: bars }, () => 0);
  const peak = Math.max(...samples, 0.01);
  return Array.from({ length: bars }, (_, index) => {
    const from = Math.floor((index * samples.length) / bars);
    const to = Math.max(from + 1, Math.floor(((index + 1) * samples.length) / bars));
    const slice = samples.slice(from, to);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    return Math.min(100, Math.round((mean / peak) * 100));
  });
}
