import { describe, expect, it } from "vitest";
import type { Message } from "@/lib/types";
import {
  EDIT_WINDOW_MS,
  baseMimeType,
  canEditMessage,
  classifyChatFile,
  dayLabel,
  deliveryStatus,
  formatDuration,
  groupReactions,
  messagePreview,
  pickRecorderType,
  waveformBars,
} from "./chatModel";

const message = (overrides: Partial<Message> = {}): Message => ({
  id: 1,
  conversationId: 9,
  senderId: "me",
  kind: "text",
  content: "Hello",
  sentAt: "2026-10-24T10:00:00.000Z",
  ...overrides,
});

describe("deliveryStatus", () => {
  it("goes sent, then delivered, then read", () => {
    expect(deliveryStatus(message())).toBe("sent");
    expect(deliveryStatus(message({ deliveredAt: "2026-10-24T10:00:02Z" }))).toBe("delivered");
    expect(deliveryStatus(message({ deliveredAt: "2026-10-24T10:00:02Z", readAt: "2026-10-24T10:01:00Z" }))).toBe("read");
  });

  it("treats a read message as read even if delivery was never recorded", () => {
    expect(deliveryStatus(message({ readAt: "2026-10-24T10:01:00Z" }))).toBe("read");
  });
});

describe("canEditMessage", () => {
  const sent = new Date("2026-10-24T10:00:00.000Z").getTime();

  it("lets the sender edit for 10 minutes", () => {
    expect(canEditMessage(message(), "me", sent + 60_000)).toBe(true);
    expect(canEditMessage(message(), "me", sent + EDIT_WINDOW_MS - 1)).toBe(true);
    expect(canEditMessage(message(), "me", sent + EDIT_WINDOW_MS)).toBe(false);
  });

  it("never lets anyone else edit", () => {
    expect(canEditMessage(message(), "someone-else", sent + 1000)).toBe(false);
    expect(canEditMessage(message(), undefined, sent + 1000)).toBe(false);
  });

  it("allows captions on photos, videos and files, but not voice, GIFs or shared posts", () => {
    for (const kind of ["image", "video", "file"] as const) expect(canEditMessage(message({ kind }), "me", sent)).toBe(true);
    for (const kind of ["audio", "gif", "post"] as const) expect(canEditMessage(message({ kind }), "me", sent)).toBe(false);
  });
});

describe("messagePreview", () => {
  it("describes each kind of message in one line", () => {
    expect(messagePreview(message({ senderId: "them" }), "me")).toBe("Hello");
    expect(messagePreview(message(), "me")).toBe("You: Hello");
    expect(messagePreview(message({ kind: "image", content: "" }), "me")).toBe("You: 📷 Photo");
    expect(messagePreview(message({ kind: "image", content: "Lab results", senderId: "them" }), "me")).toBe("📷 Photo · Lab results");
    expect(messagePreview(message({ kind: "audio", content: "", attachment: { url: null, durationMs: 12_400 } }), "me")).toBe("You: 🎤 Voice message (0:12)");
    expect(messagePreview(message({ kind: "gif", content: "", senderId: "them" }), "me")).toBe("GIF");
    expect(messagePreview(message({ kind: "post", content: "look", senderId: "them" }), "me")).toBe("📝 Shared a post · look");
  });

  it("invites a first message in an empty chat", () => {
    expect(messagePreview(null, "me")).toBe("Start the conversation");
  });
});

describe("groupReactions", () => {
  it("counts each emoji, most used first, and marks the member's own", () => {
    const groups = groupReactions(
      [
        { emoji: "😂", userId: "a" },
        { emoji: "❤️", userId: "me" },
        { emoji: "😂", userId: "b" },
      ],
      "me",
    );
    expect(groups).toEqual([
      { emoji: "😂", count: 2, mine: false, userIds: ["a", "b"] },
      { emoji: "❤️", count: 1, mine: true, userIds: ["me"] },
    ]);
  });
});

describe("classifyChatFile", () => {
  const MB = 1024 * 1024;

  it("accepts photos and PDFs up to 10 MB and videos up to 50 MB", () => {
    expect(classifyChatFile({ type: "image/jpeg", size: 9 * MB })).toEqual({ kind: "image" });
    expect(classifyChatFile({ type: "video/mp4", size: 49 * MB })).toEqual({ kind: "video" });
    expect(classifyChatFile({ type: "video/quicktime", size: 1 * MB })).toEqual({ kind: "video" });
    expect(classifyChatFile({ type: "application/pdf", size: 1 * MB })).toEqual({ kind: "file" });
  });

  it("explains what is wrong with anything else", () => {
    expect(classifyChatFile({ type: "image/jpeg", size: 11 * MB }).error).toMatch(/10 MB/);
    expect(classifyChatFile({ type: "video/mp4", size: 51 * MB }).error).toMatch(/50 MB/);
    expect(classifyChatFile({ type: "application/zip", size: 1 }).error).toMatch(/photos/);
  });
});

describe("voice recording helpers", () => {
  it("prefers WebM/Opus and falls back to what the browser can record", () => {
    expect(pickRecorderType(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickRecorderType((type) => type === "audio/mp4")).toBe("audio/mp4");
    expect(pickRecorderType(() => false)).toBeNull();
    expect(baseMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
  });

  it("turns loudness samples into 0-100 bars scaled to the loudest moment", () => {
    const bars = waveformBars([0.1, 0.1, 0.4, 0.4, 0.2, 0.2], 3);
    expect(bars).toEqual([25, 100, 50]);
    expect(waveformBars([], 4)).toEqual([0, 0, 0, 0]);
    expect(waveformBars(Array.from({ length: 500 }, (_, i) => i % 7), 40)).toHaveLength(40);
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
  });
});

describe("dayLabel", () => {
  it("says Today and Yesterday, then dates", () => {
    const now = new Date(2026, 9, 24, 15, 0);
    expect(dayLabel(new Date(2026, 9, 24, 8, 0).toISOString(), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 23, 23, 30).toISOString(), now)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 8, 1).toISOString(), now)).not.toMatch(/Today|Yesterday/);
  });
});
