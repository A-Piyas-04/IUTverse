// The post system through its route handlers: who appears where, what stays
// anonymous, and what can be done to posts that are gone or under moderation.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, storage } from "../helpers/stubs";
import { request } from "../helpers/dispatch";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;

type Ops = any[][];
const has = (ops: Ops, name: string, ...args: any[]) => ops.some(([op, ...rest]) => op === name && args.every((arg, i) => rest[i] === arg));
const listQuery = () => db.calls.find((call) => call.table === "posts" && has(call.ops, "range"))!;
const writes = (table: string, op: string) => db.calls.filter((call) => call.table === table && has(call.ops, op));
const get = (path: string) => request("GET", path, { token: "user-token" });

let post: Record<string, any> | null;
let comment: Record<string, any> | null;
let rows: any[];
let profile: Record<string, any>;

beforeEach(() => {
  resetStubs();
  post = { id: 5, author_id: OTHER, content: "Hello", status: "active", is_anonymous: false, reaction_count: 0, comment_count: 0 };
  comment = null;
  rows = [];
  profile = { department_id: 3, batch: 22 };
  db.handler = (table, ops) => {
    if (table === "profiles") return { data: profile, error: null };
    if (table === "posts") {
      if (has(ops, "range")) return { data: rows, count: rows.length, error: null };
      if (has(ops, "update") || has(ops, "single") || has(ops, "maybeSingle")) return { data: post, error: null };
      return { data: null, error: null };
    }
    if (table === "post_comments") {
      if (has(ops, "insert")) return { data: { id: 9, post_id: 5, author_id: ME, content: "x" }, error: null };
      if (has(ops, "maybeSingle")) return { data: comment, error: null };
      return { data: [], error: null };
    }
    if (table === "post_categories") return { data: { id: 1 }, error: null };
    if (table === "post_reactions") return has(ops, "maybeSingle") ? { data: null, error: null } : { data: [], error: null };
    return { data: [], error: null };
  };
});

describe("GET /api/posts?userId= (a profile's posts)", () => {
  it("lists only that member's posts, and hides their anonymous ones from others", async () => {
    await get(`/api/posts?userId=${OTHER}`);
    const { ops } = listQuery();
    expect(has(ops, "eq", "author_id", OTHER)).toBe(true);
    expect(has(ops, "eq", "is_anonymous", false)).toBe(true);
    expect(has(ops, "eq", "status", "active")).toBe(true);
  });

  it("shows members their own anonymous posts", async () => {
    await get(`/api/posts?userId=${ME}`);
    const { ops } = listQuery();
    expect(has(ops, "eq", "author_id", ME)).toBe(true);
    expect(has(ops, "eq", "is_anonymous", false)).toBe(false);
  });

  it("refuses a malformed id instead of listing everything", async () => {
    expect((await get("/api/posts?userId=nope")).status).toBe(400);
  });
});

describe("list filters", () => {
  it("searches post text, with filter syntax and wildcards neutralised", async () => {
    await get(`/api/posts?search=${encodeURIComponent("lab%,(x")}`);
    expect(listQuery().ops.find(([op]) => op === "ilike")).toEqual(["ilike", "content", "%lab   x%"]);
  });

  it("maps Community tabs onto real filters", async () => {
    await get("/api/posts?category=Media");
    expect(has(listQuery().ops, "not", "image_path", "is", null)).toBe(true);

    db.calls.length = 0;
    await get("/api/posts?category=Department");
    const { ops } = listQuery();
    expect(has(ops, "eq", "user.department_id", 3)).toBe(true);
    expect(has(ops, "eq", "is_anonymous", false)).toBe(true);

    db.calls.length = 0;
    await get("/api/posts?category=Questions");
    const links = db.calls.find((call) => call.table === "post_category_links")!;
    expect(has(links.ops, "ilike", "category.name", "question")).toBe(true);
  });

  it("gives each home tab its own posts", async () => {
    await get("/api/feed?scope=department");
    let ops = listQuery().ops;
    expect(has(ops, "eq", "user.department_id", 3)).toBe(true);
    expect(has(ops, "eq", "user.batch", 22)).toBe(false);

    db.calls.length = 0;
    await get("/api/feed?scope=batch");
    ops = listQuery().ops;
    expect(has(ops, "eq", "user.batch", 22)).toBe(true);
    expect(has(ops, "eq", "user.department_id", 3)).toBe(false);

    db.calls.length = 0;
    await get("/api/feed?scope=for_you&search=robot");
    ops = listQuery().ops;
    expect(has(ops, "eq", "user.department_id", 3) && has(ops, "eq", "user.batch", 22)).toBe(true);
    expect(has(ops, "eq", "is_anonymous", false)).toBe(true);
    expect(has(ops, "ilike", "content", "%robot%")).toBe(true);
  });

  it("is empty, not everyone, when the member has no department", async () => {
    profile = { department_id: null, batch: null };
    const res = await get("/api/feed?scope=department");
    expect(res.body.data).toEqual([]);
    expect(db.calls.some((call) => call.table === "posts")).toBe(false);
  });
});

describe("anonymous posts", () => {
  const anonymous = () => ({ id: 6, author_id: OTHER, content: "Secret", status: "active", is_anonymous: true, image_bucket: "post-media", image_path: `${OTHER}/post-1-2.jpg`, reaction_count: 0, comment_count: 0, user: { id: OTHER, display_name: "Hidden Author" } });

  it("moves the image out of the author's folder before anyone sees its URL", async () => {
    rows = [anonymous()];
    storage.put("post-media", `${OTHER}/post-1-2.jpg`, "x");
    const res = await get("/api/posts");
    const text = JSON.stringify(res.body.data[0]);
    expect(text).not.toContain(OTHER);
    expect(text).not.toContain("Hidden Author");
    expect(res.body.data[0].image).toMatch(/^anonymous\/[0-9a-f-]+\.jpg$/);
    expect(writes("posts", "update")).toHaveLength(1);
  });

  it("tells only the author that the post is theirs", async () => {
    rows = [{ ...anonymous(), author_id: ME, image_path: null }];
    let res = await get("/api/posts");
    expect(res.body.data[0]).toMatchObject({ isOwner: true, authorId: null, user: null });
    rows = [{ ...anonymous(), image_path: null }];
    res = await get("/api/posts");
    expect(res.body.data[0].isOwner).toBe(false);
  });
});

describe("posts that are gone or under moderation", () => {
  it("takes no reactions", async () => {
    const react = () => request("POST", "/api/posts/5/react", { token: "user-token", body: { reactionType: "like" } });
    post!.status = "archived";
    expect((await react()).status).toBe(404);
    post = null;
    expect((await react()).status).toBe(404);
    expect(writes("post_reactions", "upsert")).toHaveLength(0);
  });

  it("takes no replies", async () => {
    const reply = () => request("POST", "/api/posts/5/comments", { token: "user-token", body: { content: "hi" } });
    post!.status = "flagged";
    expect((await reply()).status).toBe(404);
    post = null;
    expect((await reply()).status).toBe(404);
    expect(writes("post_comments", "insert")).toHaveLength(0);
  });

  it("cannot be edited by their author", async () => {
    post = { ...post, author_id: ME, status: "archived" };
    const res = await request("PUT", "/api/posts/5", { token: "user-token", body: { content: "new" } });
    expect(res.status).toBe(403);
  });

  it("hides replies to their comments", async () => {
    comment = { id: 2, status: "active", post: { status: "archived", author_id: OTHER } };
    expect((await get("/api/comments/2/replies")).status).toBe(404);
  });
});

describe("replies", () => {
  it("must stay on the parent comment's post", async () => {
    comment = { id: 2, post_id: 999, status: "active" };
    const res = await request("POST", "/api/posts/5/comments", { token: "user-token", body: { content: "hi", parentCommentId: 2 } });
    expect(res.status).toBe(400);
    expect(writes("post_comments", "insert")).toHaveLength(0);
  });

  it("can answer a comment on the same post", async () => {
    comment = { id: 2, post_id: 5, status: "active" };
    const res = await request("POST", "/api/posts/5/comments", { token: "user-token", body: { content: "hi", parentCommentId: 2 } });
    expect(res.status).toBe(201);
  });
});

describe("cleaning up", () => {
  it("removes the image with the post", async () => {
    post = { ...post, author_id: ME, image_bucket: "post-media", image_path: `${ME}/post-1-2.jpg` };
    storage.put("post-media", `${ME}/post-1-2.jpg`, "x");
    expect((await request("DELETE", "/api/posts/5", { token: "user-token" })).status).toBe(200);
    expect(storage.has("post-media", `${ME}/post-1-2.jpg`)).toBe(false);
  });

  it("replaces the category instead of adding another", async () => {
    post = { ...post, author_id: ME };
    await request("PUT", "/api/posts/5", { token: "user-token", body: { category: "question" } });
    expect(writes("post_category_links", "delete")).toHaveLength(1);
    expect(writes("post_category_links", "upsert")).toHaveLength(1);
  });

  it("refuses an edit that changes nothing", async () => {
    post = { ...post, author_id: ME };
    expect((await request("PUT", "/api/posts/5", { token: "user-token", body: {} })).status).toBe(400);
  });
});
