// Chat settings (mute, mark as unread, nicknames, delete chat), blocking, and
// site-wide search, through the real route handlers.
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
const eqValue = (ops: Ops, column: string) => ops.find(([op, col]) => op === "eq" && col === column)?.[2];

let blocks: { blocker_id: string; blocked_id: string }[];
let tableRows: Record<string, any[]>;

beforeEach(() => {
  resetStubs();
  blocks = [];
  tableRows = {};
  db.handler = (table, ops) => {
    if (table === "conversation_participants") {
      if (has(ops, "update")) return { data: null, error: null };
      if (has(ops, "maybeSingle")) {
        const user = eqValue(ops, "user_id");
        return { data: [ME, OTHER].includes(user) ? { id: 1, cleared_at: null } : null, error: null };
      }
      return { data: [{ conversation_id: CONVERSATION, user_id: ME, muted_until: null }, { conversation_id: CONVERSATION, user_id: OTHER }], error: null };
    }
    if (table === "user_blocks") {
      if (has(ops, "upsert") || has(ops, "delete")) return { data: null, error: null };
      return { data: blocks, error: null };
    }
    if (table === "conversations") return { data: { id: CONVERSATION, conversation_type: "direct" }, error: null };
    if (table === "chat_messages") return { data: has(ops, "single") ? null : [], count: 0, error: null };
    return { data: tableRows[table] ?? [], error: null };
  };
});

describe("PATCH /api/chat/conversations/:id/settings", () => {
  const settings = (body: unknown, token = "user-token") => request("PATCH", `/api/chat/conversations/${CONVERSATION}/settings`, { token, body });
  const ownUpdate = () => arg(writes("conversation_participants", "update")[0].ops, "update");

  it("mutes for a while, until turned back on, and unmutes", async () => {
    const res = await settings({ mute: "8h" });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const until = new Date(ownUpdate().muted_until).getTime();
    expect(until - Date.now()).toBeGreaterThan(7.9 * 3600_000);
    expect(until - Date.now()).toBeLessThan(8.1 * 3600_000);
    expect(eqValue(writes("conversation_participants", "update")[0].ops, "user_id")).toBe(ME);

    resetStubs();
    db.handler = (table, ops) => (table === "conversation_participants" && has(ops, "maybeSingle") ? { data: { id: 1 }, error: null } : { data: [], error: null });
    await settings({ mute: "forever" });
    expect(ownUpdate().muted_until).toBe("9999-12-31T00:00:00.000Z");

    resetStubs();
    db.handler = (table, ops) => (table === "conversation_participants" && has(ops, "maybeSingle") ? { data: { id: 1 }, error: null } : { data: [], error: null });
    await settings({ mute: "off" });
    expect(ownUpdate().muted_until).toBeNull();
  });

  it("refuses unknown mute lengths and empty requests", async () => {
    expect((await settings({ mute: "1y" })).status).toBe(400);
    expect((await settings({})).status).toBe(400);
    expect((await settings({ markedUnread: "yes" })).status).toBe(400);
  });

  it("marks the chat unread for this member only", async () => {
    await settings({ markedUnread: true });
    expect(ownUpdate()).toEqual({ marked_unread: true });
  });

  it("sets a nickname anyone in the chat will see, but only for people in it", async () => {
    await settings({ nickname: { userId: OTHER, value: "  Robotics guy " } });
    const update = writes("conversation_participants", "update")[0];
    expect(arg(update.ops, "update")).toEqual({ nickname: "Robotics guy" });
    expect(eqValue(update.ops, "user_id")).toBe(OTHER);
    expect((await settings({ nickname: { userId: STRANGER, value: "x" } })).status).toBe(400);
  });

  it("is closed to people outside the conversation", async () => {
    expect((await settings({ mute: "1h" }, "admin-token")).status).toBe(404);
    expect(writes("conversation_participants", "update")).toHaveLength(0);
  });
});

describe("POST /api/chat/conversations/:id/clear", () => {
  it("hides the chat so far for this member only", async () => {
    const res = await request("POST", `/api/chat/conversations/${CONVERSATION}/clear`, { token: "user-token" });
    expect(res.status).toBe(200);
    const update = writes("conversation_participants", "update")[0];
    expect(new Date(arg(update.ops, "update").cleared_at).getTime()).toBeGreaterThan(Date.now() - 5000);
    expect(eqValue(update.ops, "user_id")).toBe(ME);
    expect(writes("chat_messages", "delete")).toHaveLength(0);
  });
});

describe("blocking", () => {
  it("blocks and unblocks, but never oneself", async () => {
    expect((await request("POST", `/api/chat/blocks/${OTHER}`, { token: "user-token" })).status).toBe(200);
    expect(arg(writes("user_blocks", "upsert")[0].ops, "upsert")).toEqual({ blocker_id: ME, blocked_id: OTHER });
    expect((await request("DELETE", `/api/chat/blocks/${OTHER}`, { token: "user-token" })).status).toBe(200);
    expect((await request("POST", `/api/chat/blocks/${ME}`, { token: "user-token" })).status).toBe(400);
    expect((await request("POST", "/api/chat/blocks/not-a-uuid", { token: "user-token" })).status).toBe(400);
  });

  it("stops messages both ways", async () => {
    const send = () => request("POST", "/api/chat/messages", { token: "user-token", body: { conversationId: CONVERSATION, content: "hi" } });
    blocks = [{ blocker_id: ME, blocked_id: OTHER }];
    let res = await send();
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/You blocked this person/);
    blocks = [{ blocker_id: OTHER, blocked_id: ME }];
    res = await send();
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You can't message this person.");
    expect(writes("chat_messages", "insert")).toHaveLength(0);
  });
});

describe("searching a chat and its media", () => {
  it("needs two characters and membership", async () => {
    expect((await request("GET", `/api/chat/conversations/${CONVERSATION}/search?q=a`, { token: "user-token" })).status).toBe(400);
    expect((await request("GET", `/api/chat/conversations/${CONVERSATION}/search?q=lab`, { token: "admin-token" })).status).toBe(404);
    const res = await request("GET", `/api/chat/conversations/${CONVERSATION}/search?q=lab%25_`, { token: "user-token" });
    expect(res.status).toBe(200);
    const query = db.calls.find((call) => call.table === "chat_messages" && has(call.ops, "ilike"))!;
    // Wildcards typed by the member are not patterns.
    expect(query.ops.find(([op]) => op === "ilike")).toEqual(["ilike", "content", "%lab  %"]);
  });

  it("lists media, files or links", async () => {
    expect((await request("GET", `/api/chat/conversations/${CONVERSATION}/media?type=media`, { token: "user-token" })).status).toBe(200);
    const media = db.calls.find((call) => call.table === "chat_messages" && has(call.ops, "in"))!;
    expect(media.ops.find(([op]) => op === "in")).toEqual(["in", "kind", ["image", "video", "gif"]]);
    expect((await request("GET", `/api/chat/conversations/${CONVERSATION}/media?type=secrets`, { token: "user-token" })).status).toBe(400);
  });
});

describe("GET /api/search", () => {
  const search = (query: string) => request("GET", `/api/search?${query}`, { token: "user-token" });

  it("requires sign-in, two characters and a known type", async () => {
    expect((await request("GET", "/api/search?q=robotics")).status).toBe(401);
    expect((await search("q=a")).status).toBe(400);
    expect((await search("q=robotics&type=passwords")).status).toBe(400);
  });

  it("returns a few of every kind, with whether there are more", async () => {
    tableRows.profiles = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, display_name: `Robotics ${i}` }));
    tableRows.events = [{ id: 1, title: "Robotics fair", description: "x", location: "Hall", event_date: "2026-11-01" }];
    const res = await search("q=robotics");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.groups).sort()).toEqual(["events", "jobs", "lostFound", "people", "posts", "resources"]);
    expect(res.body.data.groups.people.items).toHaveLength(4);
    expect(res.body.data.groups.people.hasMore).toBe(true);
    expect(res.body.data.groups.events).toEqual({ items: [expect.objectContaining({ id: 1, title: "Robotics fair", eventDate: "2026-11-01" })], hasMore: false });
  });

  it("only searches active posts and never reveals who wrote an anonymous one", async () => {
    tableRows.posts = [
      { id: 7, content: "Robotics club, anyone?", is_anonymous: true, user: { id: OTHER, display_name: "Secret Author" } },
      { id: 8, content: "Robotics lab hours", is_anonymous: false, user: { id: OTHER, display_name: "Open Author" } },
    ];
    const res = await search("q=robotics&type=posts");
    const [anonymous, open] = res.body.data.groups.posts.items;
    expect(anonymous).toMatchObject({ id: 7, isAnonymous: true, author: null });
    expect(JSON.stringify(anonymous)).not.toContain("Secret Author");
    expect(open.author.displayName).toBe("Open Author");
    const query = db.calls.find((call) => call.table === "posts")!;
    expect(has(query.ops, "eq", "status", "active")).toBe(true);
  });

  it("keeps PostgREST filter syntax out of the query", async () => {
    await search(`q=${encodeURIComponent("robo),status.eq.deleted,(x")}&type=events`);
    const filter = arg(db.calls.find((call) => call.table === "events")!.ops, "or") as string;
    expect(filter).not.toMatch(/status\.eq\.deleted\)|\(x/);
    expect(filter.split(",")).toHaveLength(3);
  });
});
