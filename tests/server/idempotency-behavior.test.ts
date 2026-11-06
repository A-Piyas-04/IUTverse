// Retry protection for chat messages, posts and comments (docs/api/idempotency.md), through the real route handlers.
// Supabase is stubbed by an in-memory table that enforces the same unique (author, client_request_id) rule as the
// migration, including a way to simulate losing a race. The real database constraint is exercised in the Docker
// integration run and in supabase/tests/client-request-ids.test.sql.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, startStorageServer, stopStorageServer, storage } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import chatService from "@/server/services/chatService";
import { contractViolations } from "../helpers/contract";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const STRANGER = USERS["admin-token"].id;
const CONVERSATION = 42;
const KEY = "mobile-send-0123456789abcdef";
const KEY_2 = "mobile-send-fedcba9876543210";
const NOW = "2026-10-29T08:00:00.000+00:00";

type Op = [string, ...any[]];
const has = (ops: Op[], name: string) => ops.some(([op]) => op === name);
const arg = (ops: Op[], name: string) => ops.find(([op]) => op === name)?.[1];

/** One table with the unique (authorColumn, client_request_id) rule of the migration. */
const memoryTable = (authorColumn: string, decorate: (row: any) => object = () => ({})) => {
  const rows: any[] = [];
  let nextId = 1;
  const state = { hideNextKeyLookup: false, conflicts: 0 };
  const handle = (ops: Op[]) => {
    if (has(ops, "insert")) {
      const row = arg(ops, "insert");
      if (row.client_request_id && rows.some((r) => r[authorColumn] === row[authorColumn] && r.client_request_id === row.client_request_id)) {
        state.conflicts += 1;
        return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      const saved = { id: nextId++, created_at: NOW, updated_at: NOW, sent_at: NOW, ...row, ...decorate(row) };
      rows.push(saved);
      return { data: saved, error: null };
    }
    const filters = ops.filter(([op]) => op === "eq");
    const keyLookup = filters.some(([, column]) => column === "client_request_id");
    if (keyLookup && state.hideNextKeyLookup) {
      state.hideNextKeyLookup = false;
      return { data: null, error: null };
    }
    const matches = rows.filter((r) => filters.every(([, column, value]) => r[column] === value));
    return has(ops, "maybeSingle") || has(ops, "single") ? { data: matches[0] ?? null, error: null } : { data: matches, count: matches.length, error: null };
  };
  return { rows, state, handle };
};

let messages: ReturnType<typeof memoryTable>;
let posts: ReturnType<typeof memoryTable>;
let comments: ReturnType<typeof memoryTable>;
let blocked: boolean;

beforeAll(startStorageServer);
afterAll(stopStorageServer);
beforeEach(() => {
  resetStubs();
  blocked = false;
  messages = memoryTable("sender_id", (row) => ({ sender: { id: row.sender_id, display_name: "Sender" } }));
  posts = memoryTable("author_id", (row) => ({ user: { id: row.author_id, display_name: "Author" }, status: "active", reaction_count: 0, comment_count: 0 }));
  comments = memoryTable("author_id", (row) => ({ user: { id: row.author_id, display_name: "Author" }, replies: [] }));
  db.handler = (table, ops) => {
    switch (table) {
      case "conversation_participants": {
        if (has(ops, "maybeSingle")) {
          const asking = ops.find(([op, column]) => op === "eq" && column === "user_id")?.[2];
          return { data: [ME, OTHER].includes(asking) ? { id: 1 } : null, error: null };
        }
        return { data: [{ user_id: ME }, { user_id: OTHER }], error: null };
      }
      case "user_blocks": return { data: blocked ? [{ blocker_id: OTHER, blocked_id: ME }] : [], error: null };
      case "chat_messages": return messages.handle(ops);
      case "posts": return posts.handle(ops);
      case "post_comments": return has(ops, "insert") || ops.some(([op, column]) => op === "eq" && column === "client_request_id") ? comments.handle(ops) : { data: [], count: 0, error: null };
      default: return { data: [], count: 0, error: null };
    }
  };
});

const send = (body: object, headers: Record<string, string> = {}, token = "user-token") => request("POST", "/api/chat/messages", { token, body, headers });
const sendKeyed = (content = "Hello", key = KEY, token = "user-token") => send({ conversationId: CONVERSATION, content }, { "Idempotency-Key": key }, token);

describe("chat messages", () => {
  it("without a key behaves as it always has: every send creates a message", async () => {
    const a = await send({ conversationId: CONVERSATION, content: "Hello" });
    const b = await send({ conversationId: CONVERSATION, content: "Hello" });
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.data.id).not.toBe(b.body.data.id);
    expect(messages.rows).toHaveLength(2);
    expect(a.headers.get("idempotent-replayed")).toBeNull();
    expect(messages.rows.every((row) => row.client_request_id === null)).toBe(true);
  });

  it("a retry with the same key and payload returns the same message and creates nothing", async () => {
    const first = await sendKeyed();
    const retry = await sendKeyed();
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(retry.headers.get("idempotent-replayed")).toBe("true");
    expect(first.headers.get("idempotent-replayed")).toBeNull();
    expect(messages.rows).toHaveLength(1);
    expect(messages.rows[0].client_request_id).toBe(KEY);
  });

  it("many retries of the same send still produce exactly one message", async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => sendKeyed("Same")));
    expect(results.every((res) => res.status === 201)).toBe(true);
    expect(new Set(results.map((res) => res.body.data.id)).size).toBe(1);
    expect(messages.rows).toHaveLength(1);
  });

  it("refuses the same key with different content (409 IDEMPOTENCY_KEY_REUSED) and creates nothing", async () => {
    await sendKeyed("Original");
    const reuse = await sendKeyed("Something else");
    expect(reuse.status).toBe(409);
    expect(reuse.body).toMatchObject({ success: false, code: "IDEMPOTENCY_KEY_REUSED" });
    expect(messages.rows).toHaveLength(1);
    expect(messages.rows[0].content).toBe("Original");
  });

  it("a new key is a new message", async () => {
    await sendKeyed("One", KEY);
    const second = await sendKeyed("One", KEY_2);
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replayed")).toBeNull();
    expect(messages.rows).toHaveLength(2);
  });

  it("keys are scoped to the sender: the same key from another member is independent", async () => {
    const mine = await sendKeyed("From me", KEY, "user-token");
    const theirs = await sendKeyed("From them", KEY, "mod-token");
    expect([mine.status, theirs.status]).toEqual([201, 201]);
    expect(theirs.body.data.id).not.toBe(mine.body.data.id);
    expect(theirs.headers.get("idempotent-replayed")).toBeNull();
    expect(messages.rows.map((row) => row.sender_id).sort()).toEqual([ME, OTHER].sort());
  });

  it("a lost race returns the winner's message instead of an error", async () => {
    const winner = await sendKeyed("Race");
    messages.state.hideNextKeyLookup = true; // the retry checked before the first request committed
    const loser = await sendKeyed("Race");
    expect(loser.status).toBe(201);
    expect(loser.body.data.id).toBe(winner.body.data.id);
    expect(loser.headers.get("idempotent-replayed")).toBe("true");
    expect(messages.state.conflicts).toBe(1);
    expect(messages.rows).toHaveLength(1);
  });

  it("rejects a malformed key with 400 IDEMPOTENCY_KEY_INVALID and sends nothing", async () => {
    for (const key of ["short", "has spaces in the key 123456", "x".repeat(65), "bad/char/in/key/1234567", ""]) {
      const res = await send({ conversationId: CONVERSATION, content: "Hi" }, { "Idempotency-Key": key });
      expect(res.status, JSON.stringify(key)).toBe(400);
      expect(res.body.code).toBe("IDEMPOTENCY_KEY_INVALID");
    }
    expect(messages.rows).toHaveLength(0);
  });

  it("does not bypass authorization: a non-participant is refused and nothing is stored", async () => {
    const res = await sendKeyed("Intruder", KEY, "admin-token");
    expect(res.status).toBe(403);
    expect(messages.rows).toHaveLength(0);
    expect(STRANGER).toBeDefined();
  });

  it("does not replay for a sender who has since been blocked", async () => {
    await sendKeyed("Before the block");
    blocked = true;
    const retry = await sendKeyed("Before the block");
    expect(retry.status).toBe(403);
    expect(retry.headers.get("idempotent-replayed")).toBeNull();
  });

  it("requires authentication before looking at the key", async () => {
    const res = await request("POST", "/api/chat/messages", { body: { conversationId: CONVERSATION, content: "Hi" }, headers: { "Idempotency-Key": KEY } });
    expect(res.status).toBe(401);
  });

  it("the replayed response still matches the contract", async () => {
    await sendKeyed();
    const retry = await sendKeyed();
    expect(retry.status).toBe(201);
    expect(retry.body.data).toMatchObject({ conversationId: CONVERSATION, senderId: ME, content: "Hello" });
    expect(retry.headers.get("x-request-id")).toBeTruthy();
    expect(contractViolations("chat_sendMessage", 201, retry.body)).toEqual([]);
  });
});

describe("chat service: attachments are stored once", () => {
  const attachment = (path: string) => ({ path, bucket: "chat-attachments", name: "a.png", mimeType: "image/png", size: 10 });
  const options = (storeAttachment: () => Promise<any>, extra: object = {}) => ({ clientRequestId: KEY, attachmentRef: { size: 10 }, storeAttachment, ownsAttachment: true, ...extra });

  it("does not store the file again on a retry", async () => {
    const store = vi.fn(async () => attachment(`${ME}/message-1-1.png`));
    const first = await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(store));
    const retry = await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(store));
    expect(store).toHaveBeenCalledTimes(1);
    expect([first.replayed, retry.replayed]).toEqual([false, true]);
    expect(retry.message.id).toBe(first.message.id);
    expect(messages.rows).toHaveLength(1);
  });

  it("a race loser deletes the copy it stored itself and returns the winner", async () => {
    await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(`${ME}/message-1-1.png`)));
    messages.state.hideNextKeyLookup = true;
    const loserPath = `${ME}/message-2-2.png`;
    const loser = await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(loserPath)));
    expect(loser.replayed).toBe(true);
    expect(storage.calls).toContainEqual(["remove", "chat-attachments", loserPath]);
    expect(messages.rows).toHaveLength(1);
  });

  it("never deletes an object the client uploaded itself (direct upload)", async () => {
    await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(`${ME}/message-1-1.png`), { attachmentRef: { path: `${ME}/message-1-1.png` }, ownsAttachment: false }));
    messages.state.hideNextKeyLookup = true;
    const clientObject = `${ME}/message-9-9.png`;
    await expect(
      chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(clientObject), { attachmentRef: { path: clientObject }, ownsAttachment: false }))
    ).rejects.toMatchObject({ statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
    expect(storage.calls.filter((call) => call[0] === "remove")).toHaveLength(0);
  });

  it("refuses the same key with a different attachment", async () => {
    await chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(`${ME}/message-1-1.png`)));
    await expect(chatService.sendMessageOnce(CONVERSATION, ME, { content: "" }, options(async () => attachment(`${ME}/x.png`), { attachmentRef: { size: 99 } }))).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("posts", () => {
  const create = (body: object, key?: string, token = "user-token") => request("POST", "/api/posts", { token, body, headers: key ? { "Idempotency-Key": key } : {} });

  it("without a key every request creates a post", async () => {
    await create({ content: "Hi" });
    await create({ content: "Hi" });
    expect(posts.rows).toHaveLength(2);
  });

  it("a retry with the same key returns the same post", async () => {
    const first = await create({ content: "Hello campus" }, KEY);
    const retry = await create({ content: "Hello campus" }, KEY);
    expect([first.status, retry.status]).toEqual([201, 201]);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(retry.headers.get("idempotent-replayed")).toBe("true");
    expect(contractViolations("posts_createPost", 201, first.body)).toEqual([]);
    expect(contractViolations("posts_createPost", 201, retry.body)).toEqual([]);
    expect(posts.rows).toHaveLength(1);
  });

  it("refuses the same key with a different post", async () => {
    await create({ content: "Hello campus" }, KEY);
    const reuse = await create({ content: "Another post" }, KEY);
    expect(reuse.status).toBe(409);
    expect(reuse.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(posts.rows).toHaveLength(1);
  });

  it("is scoped to the author, survives a lost race, and rejects malformed keys", async () => {
    const mine = await create({ content: "Same text" }, KEY, "user-token");
    const theirs = await create({ content: "Same text" }, KEY, "mod-token");
    expect(theirs.body.data.id).not.toBe(mine.body.data.id);

    posts.state.hideNextKeyLookup = true;
    const loser = await create({ content: "Same text" }, KEY, "user-token");
    expect(loser.status).toBe(201);
    expect(loser.body.data.id).toBe(mine.body.data.id);
    expect(posts.rows).toHaveLength(2);

    const bad = await create({ content: "x" }, "short");
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("IDEMPOTENCY_KEY_INVALID");
  });

  it("anonymous flag is part of the request identity", async () => {
    await create({ content: "Secret", isAnonymous: true }, KEY);
    expect((await create({ content: "Secret", isAnonymous: false }, KEY)).status).toBe(409);
    expect((await create({ content: "Secret", isAnonymous: true }, KEY)).status).toBe(201);
  });
});

describe("comments", () => {
  // Replies need a live post to land on.
  beforeEach(() => {
    posts.rows.push({ id: 5, status: "active" }, { id: 6, status: "active" });
  });

  const comment = (body: object, key?: string, postId = 5, token = "user-token") =>
    request("POST", `/api/posts/${postId}/comments`, { token, body, headers: key ? { "Idempotency-Key": key } : {} });

  it("without a key every request creates a comment", async () => {
    await comment({ content: "Nice" });
    await comment({ content: "Nice" });
    expect(comments.rows).toHaveLength(2);
  });

  it("a retry with the same key returns the same comment", async () => {
    const first = await comment({ content: "Nice" }, KEY);
    const retry = await comment({ content: "Nice" }, KEY);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(retry.headers.get("idempotent-replayed")).toBe("true");
    expect(contractViolations("posts_createComment", 201, retry.body)).toEqual([]);
    expect(comments.rows).toHaveLength(1);
  });

  it("refuses the same key for a different comment or a different post", async () => {
    await comment({ content: "Nice" }, KEY);
    expect((await comment({ content: "Other words" }, KEY)).status).toBe(409);
    expect((await comment({ content: "Nice" }, KEY, 6)).status).toBe(409);
    expect(comments.rows).toHaveLength(1);
  });

  it("a retry still gets its reply after the post is hidden, but a new reply does not land", async () => {
    const first = await comment({ content: "Nice" }, KEY);
    posts.rows[0].status = "archived";
    const retry = await comment({ content: "Nice" }, KEY);
    expect(retry.status).toBe(201);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect((await comment({ content: "Nice" }, KEY_2)).status).toBe(404);
    expect(comments.rows).toHaveLength(1);
  });

  it("is scoped to the author and survives a lost race", async () => {
    const mine = await comment({ content: "Nice" }, KEY, 5, "user-token");
    const theirs = await comment({ content: "Nice" }, KEY, 5, "mod-token");
    expect(theirs.body.data.id).not.toBe(mine.body.data.id);
    comments.state.hideNextKeyLookup = true;
    const loser = await comment({ content: "Nice" }, KEY, 5, "user-token");
    expect(loser.body.data.id).toBe(mine.body.data.id);
    expect(comments.rows).toHaveLength(2);
  });
});
