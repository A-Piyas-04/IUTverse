// Starting a conversation returns it from the caller's point of view, so the
// chat header can name the other member before any message has been sent.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs } from "../helpers/stubs";
import { request } from "../helpers/dispatch";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const profile = (id: string, name: string) => ({ id, display_name: name, handle: null, batch: 22, profile_image_path: null, cover_image_path: null, department: { id: 1, name: "CSE" } });
const has = (ops: any[][], name: string, ...args: any[]) => ops.some(([op, ...rest]) => op === name && args.every((arg, i) => rest[i] === arg));

const start = (otherUserId: string) => request("POST", "/api/chat/conversations", { token: "user-token", body: { otherUserId } });

describe("POST /api/chat/conversations", () => {
  let exists: boolean;

  beforeEach(() => {
    resetStubs();
    exists = false;
    db.handler = (table, ops) => {
      if (table === "conversations" && has(ops, "insert")) {
        exists = true;
        return { data: { id: 42, conversation_type: "direct", direct_key: [ME, OTHER].sort().join(":") }, error: null };
      }
      if (table === "conversations" && has(ops, "eq", "direct_key")) return { data: exists ? { id: 42 } : null, error: null };
      if (table === "conversations") return { data: { id: 42, conversation_type: "direct", direct_key: "k", created_at: "2026-10-23", updated_at: "2026-10-23" }, error: null };
      if (table === "conversation_participants" && has(ops, "insert")) return { data: null, error: null };
      if (table === "conversation_participants") {
        return { data: [
          { id: 1, conversation_id: 42, user_id: ME, user: profile(ME, "Me Myself") },
          { id: 2, conversation_id: 42, user_id: OTHER, user: profile(OTHER, "Other Member") },
        ], error: null };
      }
      if (table === "chat_messages") return { data: [], count: 0, error: null };
      return { data: [], error: null };
    };
  });

  it("names the other member on a brand-new conversation", async () => {
    const res = await start(OTHER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(42);
    expect(res.body.data.otherUser).toMatchObject({ id: OTHER, displayName: "Other Member", department: "CSE" });
    expect(db.calls.some((call) => call.table === "conversations" && has(call.ops, "insert"))).toBe(true);
  });

  it("names the other member when the conversation already exists", async () => {
    exists = true;
    const res = await start(OTHER);
    expect(res.status).toBe(200);
    expect(res.body.data.otherUser).toMatchObject({ id: OTHER, displayName: "Other Member" });
    expect(db.calls.some((call) => call.table === "conversations" && has(call.ops, "insert"))).toBe(false);
  });

  it("still refuses a conversation with yourself", async () => {
    const res = await start(ME);
    expect(res.status).toBe(400);
  });
});
