// Messaging features through the real route handlers: edits within 10
// minutes, emoji reactions, delivery and read receipts, GIF and shared-post
// messages, sharing a post to several chats.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs } from "../helpers/stubs";
import { request } from "../helpers/dispatch";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const STRANGER = USERS["admin-token"].id;
const CONVERSATION = 42;

type Ops = any[][];
const has = (ops: Ops, name: string, ...args: any[]) => ops.some(([op, ...rest]) => op === name && args.every((arg, i) => rest[i] === arg));
const arg = (ops: Ops, name: string) => ops.find(([op]) => op === name)?.[1];
const writes = (table: string, op: string) => db.calls.filter((call) => call.table === table && has(call.ops, op));

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
let stored: Record<string, any>;
let reaction: { id: number; emoji: string } | null;
let postStatus: string | null;

const messageRow = () => ({ ...stored, sender: { id: stored.sender_id, display_name: "Sender" } });

beforeEach(() => {
  resetStubs();
  stored = { id: 7, conversation_id: CONVERSATION, sender_id: ME, kind: "text", content: "Helo", sent_at: minutesAgo(2), delivered_at: null, read_at: null, edited_at: null };
  reaction = null;
  postStatus = "active";
  db.handler = (table, ops) => {
    if (table === "conversation_participants") {
      const asking = arg(ops, "eq") === "conversation_id" ? ops.find(([op, column]) => op === "eq" && column === "user_id")?.[2] : null;
      if (asking) return { data: [ME, OTHER].includes(asking) ? { id: 1 } : null, error: null };
      return { data: [{ conversation_id: CONVERSATION }], error: null };
    }
    if (table === "chat_messages") {
      if (has(ops, "update")) return { data: has(ops, "single") ? { ...messageRow(), ...arg(ops, "update") } : [{ id: 7 }, { id: 8 }], error: null };
      if (has(ops, "insert")) return { data: { id: 99, ...arg(ops, "insert"), sent_at: new Date().toISOString(), sender: null }, error: null };
      return { data: messageRow(), error: null };
    }
    if (table === "chat_message_reactions") {
      if (has(ops, "maybeSingle")) return { data: reaction, error: null };
      if (has(ops, "in")) return { data: reaction ? [{ message_id: 7, user_id: ME, emoji: reaction.emoji }] : [], error: null };
      return { data: null, error: null };
    }
    if (table === "posts") {
      if (has(ops, "maybeSingle")) return { data: postStatus ? { id: 5, status: postStatus } : null, error: null };
      return { data: [{ id: 5, content: "A post", status: postStatus, is_anonymous: false, user: { id: OTHER, display_name: "Author" } }], error: null };
    }
    if (table === "conversations") return { data: { id: CONVERSATION, conversation_type: "direct", direct_key: [ME, OTHER].sort().join(":") }, error: null };
    return { data: [], error: null };
  };
});

describe("PATCH /api/chat/messages/:id (edit)", () => {
  const edit = (content: unknown, token = "user-token") => request("PATCH", "/api/chat/messages/7", { token, body: { content } });

  it("changes the text and marks it edited within 10 minutes", async () => {
    const res = await edit("Hello");
    expect(res.status).toBe(200);
    const update = arg(writes("chat_messages", "update")[0].ops, "update");
    expect(update.content).toBe("Hello");
    expect(new Date(update.edited_at).getTime()).toBeGreaterThan(Date.now() - 5000);
    expect(res.body.data.editedAt).toBe(update.edited_at);
  });

  it("refuses once 10 minutes have passed", async () => {
    stored.sent_at = minutesAgo(11);
    const res = await edit("Hello");
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/10 minutes/);
    expect(writes("chat_messages", "update")).toHaveLength(0);
  });

  it("only lets the sender edit", async () => {
    const res = await edit("Hello", "mod-token");
    expect(res.status).toBe(404);
    expect(writes("chat_messages", "update")).toHaveLength(0);
  });

  it("will not empty a text message, and leaves voice messages alone", async () => {
    expect((await edit("   ")).status).toBe(400);
    stored.kind = "audio";
    expect((await edit("caption")).status).toBe(400);
    expect(writes("chat_messages", "update")).toHaveLength(0);
  });
});

describe("POST /api/chat/messages/:id/reactions", () => {
  const react = (emoji: unknown, token = "user-token") => request("POST", "/api/chat/messages/7/reactions", { token, body: { emoji } });

  it("adds a reaction for a participant", async () => {
    const res = await react("😂");
    expect(res.status).toBe(200);
    const upsert = arg(writes("chat_message_reactions", "upsert")[0].ops, "upsert");
    expect(upsert).toEqual({ message_id: 7, conversation_id: CONVERSATION, user_id: ME, emoji: "😂" });
  });

  it("removes it when the same emoji is chosen again", async () => {
    reaction = { id: 3, emoji: "😂" };
    await react("😂");
    expect(writes("chat_message_reactions", "delete")).toHaveLength(1);
    expect(writes("chat_message_reactions", "upsert")).toHaveLength(0);
  });

  it("accepts joined emoji but not text", async () => {
    expect((await react("👨‍💻")).status).toBe(200);
    expect((await react("lol")).status).toBe(400);
    expect((await react("<img>")).status).toBe(400);
    expect((await react("😂😂😂😂😂😂😂😂😂")).status).toBe(400);
  });

  it("is invisible to people outside the conversation", async () => {
    const res = await react("😂", "admin-token");
    expect(res.status).toBe(404);
    expect(writes("chat_message_reactions", "upsert")).toHaveLength(0);
  });
});

describe("receipts", () => {
  it("POST /api/chat/delivered marks messages from others in the member's chats", async () => {
    const res = await request("POST", "/api/chat/delivered", { token: "user-token" });
    expect(res.status).toBe(200);
    const [update] = writes("chat_messages", "update");
    expect(Object.keys(arg(update.ops, "update"))).toEqual(["delivered_at"]);
    expect(has(update.ops, "neq", "sender_id", ME)).toBe(true);
    expect(has(update.ops, "is", "delivered_at", null)).toBe(true);
    expect(res.body.data.updated).toBe(2);
  });

  it("PUT /api/chat/conversations/:id/read marks them delivered and read", async () => {
    const res = await request("PUT", `/api/chat/conversations/${CONVERSATION}/read`, { token: "user-token" });
    expect(res.status).toBe(200);
    const updates = writes("chat_messages", "update").map((call) => Object.keys(arg(call.ops, "update"))[0]);
    expect(updates).toEqual(["delivered_at", "read_at"]);
  });
});

describe("POST /api/chat/messages with GIFs and shared posts", () => {
  const send = (body: Record<string, unknown>) => request("POST", "/api/chat/messages", { token: "user-token", body: { conversationId: CONVERSATION, ...body } });
  const inserted = () => arg(writes("chat_messages", "insert")[0].ops, "insert");

  it("stores a KLIPY GIF as a GIF message", async () => {
    const res = await send({ gifUrl: "https://static.klipy.com/ii/a/b.webp", gifWidth: 320, gifHeight: 240 });
    expect(res.status).toBe(201);
    expect(inserted()).toMatchObject({ kind: "gif", gif_url: "https://static.klipy.com/ii/a/b.webp", gif_width: 320, gif_height: 240 });
    expect(res.body.data.gif).toEqual({ url: "https://static.klipy.com/ii/a/b.webp", width: 320, height: 240 });
  });

  it("refuses GIF links from anywhere else", async () => {
    const res = await send({ gifUrl: "https://evil.example/track.gif" });
    expect(res.status).toBe(400);
    expect(writes("chat_messages", "insert")).toHaveLength(0);
  });

  it("shares a visible post with a note", async () => {
    const res = await send({ sharedPostId: 5, content: "Look at this" });
    expect(res.status).toBe(201);
    expect(inserted()).toMatchObject({ kind: "post", shared_post_id: 5, content: "Look at this" });
    expect(res.body.data.sharedPost).toMatchObject({ id: 5, available: true, content: "A post" });
  });

  it("refuses to share a post that is gone or under moderation", async () => {
    postStatus = "archived";
    expect((await send({ sharedPostId: 5 })).status).toBe(404);
    postStatus = null;
    expect((await send({ sharedPostId: 5 })).status).toBe(404);
    expect(writes("chat_messages", "insert")).toHaveLength(0);
  });

  it("takes one attachment, GIF or post per message", async () => {
    const res = await send({ sharedPostId: 5, gifUrl: "https://static.klipy.com/ii/a/b.webp" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/chat/share", () => {
  const share = (body: Record<string, unknown>) => request("POST", "/api/chat/share", { token: "user-token", body: { postId: 5, ...body } });

  it("sends the post to existing chats and to members", async () => {
    const res = await share({ conversationIds: [CONVERSATION], userIds: [OTHER], message: "Thoughts?" });
    expect(res.status).toBe(201);
    // Both resolve to the same direct chat, so it gets the post once.
    expect(res.body.data).toEqual({ sent: 1, conversationIds: [CONVERSATION] });
    expect(writes("chat_messages", "insert").map((call) => arg(call.ops, "insert"))).toEqual([
      expect.objectContaining({ conversation_id: CONVERSATION, kind: "post", shared_post_id: 5, content: "Thoughts?" }),
    ]);
  });

  it("checks recipients", async () => {
    expect((await share({})).status).toBe(400);
    expect((await share({ userIds: [ME] })).status).toBe(400);
    expect((await share({ userIds: ["not-a-uuid"] })).status).toBe(400);
    expect((await share({ conversationIds: Array.from({ length: 16 }, (_, i) => i + 1) })).status).toBe(400);
    expect(writes("chat_messages", "insert")).toHaveLength(0);
  });

  it("will not post into a conversation the member is not in", async () => {
    const res = await request("POST", "/api/chat/share", { token: "admin-token", body: { postId: 5, conversationIds: [CONVERSATION] } });
    expect(res.status).toBe(403);
    expect(STRANGER).not.toBe(ME);
  });
});

describe("GET /api/chat/gifs", () => {
  it("answers 503 until a KLIPY key is configured; the picker shows that as not set up", async () => {
    // 5xx bodies are replaced by the route pipeline, so the status is the signal.
    const res = await request("GET", "/api/chat/gifs?q=hello", { token: "user-token" });
    expect(res.status).toBe(503);
  });
});
