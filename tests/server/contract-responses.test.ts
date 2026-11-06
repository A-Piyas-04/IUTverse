// Conformance: the real proxy, route chains and handlers (Supabase stubbed, see tests/helpers/stubs.ts) must answer
// in the shapes docs/api/openapi.yaml promises. Operations covered here are exactly those marked
// `x-contract-status: verified` in the contract; the last test keeps the two lists equal.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, security, startStorageServer, stopStorageServer } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import { contractOperations, contractViolations, operationsWithConformanceTests, requestBodyViolations } from "../helpers/contract";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"];
const OTHER = "00000000-0000-4000-8000-0000000000bb";
const NOW = "2026-10-24T08:30:00.000+00:00";

const profileRow = (id = OTHER) => ({
  id, display_name: "Rahim Uddin", handle: "rahim", department_id: 3, batch: 21, bio: "Hello", interests: ["chess"], badges: [],
  profile_image_path: null, cover_image_path: null, created_at: NOW, department: { name: "CSE" },
});
const postRow = (id = 1) => ({
  id, author_id: OTHER, content: "First post", is_anonymous: false, created_at: NOW, updated_at: NOW, status: "active",
  image_path: null, image_bucket: null, reaction_count: 1, comment_count: 1, user: profileRow(),
});
const commentRow = (id = 7) => ({
  id, post_id: 1, author_id: OTHER, content: "Nice", is_anonymous: false, created_at: NOW, updated_at: NOW,
  parent_comment_id: null, user: profileRow(), replies: [],
});

const conforms = (operationId: string, res: { status: number; body: unknown }) => {
  expect(contractViolations(operationId, res.status, res.body), `${operationId} ${res.status}`).toEqual([]);
};

beforeAll(startStorageServer);
afterAll(stopStorageServer);
beforeEach(() => {
  resetStubs();
  db.handler = (table, ops) => {
    const has = (name: string) => ops.some(([op]) => op === name);
    switch (table) {
      case "posts": return has("maybeSingle") || has("single") ? { data: postRow(), error: null } : { data: [postRow()], count: 1, error: null };
      case "post_category_links": return { data: [{ category: { id: 1, name: "General" } }], error: null };
      case "post_reactions": return { data: [{ id: 5, post_id: 1, user_id: OTHER, reaction_type: "like", user: profileRow() }], error: null };
      case "post_comments": return has("maybeSingle") || has("single") ? { data: commentRow(), error: null } : { data: [commentRow()], count: 1, error: null };
      case "profiles": return has("maybeSingle") || has("single") ? { data: profileRow(), error: null } : { data: [profileRow()], count: 1, error: null };
      case "profile_private": return { data: { user_id: ME.id, student_id: "210041001", privacy: {}, college_name: null, program: { code: "CSE" }, hall: { name: "North" } }, error: null };
      case "departments": return { data: [{ id: 1, name: "CSE" }], error: null };
      case "programs": return { data: [{ id: 1, department_id: 1, code: "CSE", name: "Computer Science" }], error: null };
      case "residence_halls": return { data: [{ id: 1, name: "North" }], error: null };
      case "hall_rooms": return { data: [{ id: 1, hall_id: 1, room_number: "101" }], error: null };
      default: return { data: [], count: 0, error: null };
    }
  };
});

describe("health and authentication", () => {
  it("health_get", async () => conforms("health_get", await request("GET", "/api/health")));

  it("auth_getMe", async () => {
    const res = await request("GET", "/api/auth/me", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: ME.id, email: ME.email, role: "user", membershipStatus: "active" });
    conforms("auth_getMe", res);
  });

  it("auth_validateToken", async () => {
    const res = await request("GET", "/api/auth/validate", { token: "user-token" });
    expect(res.status).toBe(200);
    conforms("auth_validateToken", res);
  });

  it("distinguishes the three authentication failures by status and code", async () => {
    const missing = await request("GET", "/api/auth/me");
    expect([missing.status, missing.body.code]).toEqual([401, "AUTH_TOKEN_REQUIRED"]);
    expect(contractViolations("auth_getMe", 401, missing.body)).toEqual([]);

    const invalid = await request("GET", "/api/auth/me", { token: "expired-or-garbage" });
    expect([invalid.status, invalid.body.code]).toEqual([403, "AUTH_TOKEN_INVALID"]);
    expect(contractViolations("auth_getMe", 403, invalid.body)).toEqual([]);

    const suspended = await request("GET", "/api/auth/me", { token: "suspended-mod-token" });
    expect([suspended.status, suspended.body.code]).toEqual([403, "MEMBERSHIP_REQUIRED"]);
    expect(contractViolations("auth_getMe", 403, suspended.body)).toEqual([]);
  });

  it("keeps the existing error messages (clients may match on them)", async () => {
    expect((await request("GET", "/api/auth/me")).body).toMatchObject({ success: false, message: "Access token required" });
    expect((await request("GET", "/api/auth/me", { token: "nope" })).body).toMatchObject({ success: false, message: "Invalid Supabase token" });
  });

  it("surfaces a database failure during membership lookup as a 500 that matches the contract", async () => {
    security.getSecurityContext = async () => {
      throw new Error("db down");
    };
    const res = await request("GET", "/api/auth/me", { token: "user-token" });
    expect(res.status).toBe(500);
    expect(contractViolations("auth_getMe", 500, res.body)).toEqual([]);
  });
});

describe("request ids", () => {
  it("echoes a well-formed client X-Request-Id on success and on error", async () => {
    const ok = await request("GET", "/api/auth/me", { token: "user-token", headers: { "X-Request-Id": "mobile-0001-abcdef" } });
    expect(ok.headers.get("x-request-id")).toBe("mobile-0001-abcdef");
    const denied = await request("GET", "/api/auth/me", { headers: { "X-Request-Id": "mobile-0002-abcdef" } });
    expect(denied.headers.get("x-request-id")).toBe("mobile-0002-abcdef");
  });

  it("generates an id when none is sent and replaces unsafe or oversized ones", async () => {
    const none = await request("GET", "/api/health");
    expect(none.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    for (const bad of ["short", "has spaces in it", "x".repeat(129), "bad\u0000chars-here"]) {
      const res = await request("GET", "/api/health", { headers: { "X-Request-Id": bad } }).catch(() => null);
      if (res) expect(res.headers.get("x-request-id")).not.toBe(bad);
    }
  });
});

describe("profile and members", () => {
  it("profile_getOwnProfile", async () => {
    const res = await request("GET", "/api/profile", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.data.studentId).toBe("210041001");
    conforms("profile_getOwnProfile", res);
  });

  it("profile_getOwnProfileMe", async () => {
    const res = await request("GET", "/api/profile/me", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.data.studentId).toBe("210041001");
    conforms("profile_getOwnProfileMe", res);
  });

  it("profile_getProfile", async () => {
    const res = await request("GET", `/api/profile/${OTHER}`, { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("studentId");
    conforms("profile_getProfile", res);
  });

  it("profileReferenceData_getProfileReferenceData", async () => {
    const res = await request("GET", "/api/profile-reference-data", { token: "user-token" });
    expect(res.status).toBe(200);
    conforms("profileReferenceData_getProfileReferenceData", res);
  });

  it("user_getUserById", async () => {
    const res = await request("GET", `/api/user/${OTHER}`, { token: "user-token" });
    expect(res.status).toBe(200);
    conforms("user_getUserById", res);
  });

  it("users_searchUsers", async () => {
    const res = await request("GET", "/api/users/search?q=ra", { token: "user-token" });
    expect(res.status).toBe(200);
    conforms("users_searchUsers", res);
  });

  it("answers a too-short search with a 400 that matches the error schema", async () => {
    const res = await request("GET", "/api/users/search?q=r", { token: "user-token" });
    expect(res.status).toBe(400);
    expect(contractViolations("users_searchUsers", 400, res.body)).toEqual([]);
  });
});

describe("feed, posts and comments", () => {
  it("posts_getPosts with pagination metadata", async () => {
    const res = await request("GET", "/api/posts?page=2&limit=5", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 5, totalPosts: 1 });
    conforms("posts_getPosts", res);
  });

  it("feed_getUserFeed", async () => {
    const res = await request("GET", "/api/feed", { token: "user-token" });
    expect(res.status).toBe(200);
    conforms("feed_getUserFeed", res);
  });

  it("posts_getPost", async () => {
    const res = await request("GET", "/api/posts/1", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.data.reactionSummary.like).toBe(1);
    conforms("posts_getPost", res);
  });

  it("posts_getPostComments with pagination metadata", async () => {
    const res = await request("GET", "/api/posts/1/comments", { token: "user-token" });
    expect(res.status).toBe(200);
    expect(res.body.pagination).toHaveProperty("totalComments");
    conforms("posts_getPostComments", res);
  });

  it("answers a malformed post id with a 400 that matches the error schema", async () => {
    const res = await request("GET", "/api/posts/not-a-number", { token: "user-token" });
    expect(res.status).toBe(400);
    expect(contractViolations("posts_getPost", 400, res.body)).toEqual([]);
  });

  it("hides the author of an anonymous post", async () => {
    const anonymous = { ...postRow(), is_anonymous: true };
    const base = db.handler;
    db.handler = (table, ops) => (table === "posts" ? { data: anonymous, error: null } : base(table, ops));
    const res = await request("GET", "/api/posts/1", { token: "user-token" });
    expect(res.body.data).toMatchObject({ isAnonymous: true, userId: null, authorId: null, user: null });
    expect(contractViolations("posts_getPost", 200, res.body)).toEqual([]);
  });
});

describe("uploads", () => {
  it("uploads_createUploadIntent", async () => {
    const body = { purpose: "post", mimeType: "image/png", size: 1024 };
    expect(requestBodyViolations("uploads_createUploadIntent", body)).toEqual([]);
    const res = await request("POST", "/api/uploads", { token: "user-token", body });
    expect(res.status).toBe(201);
    expect(res.body.data.path).toMatch(new RegExp(`^${ME.id}/post-`));
    conforms("uploads_createUploadIntent", res);
  });

  it("rejects a disallowed type with a 400 that matches the error schema", async () => {
    const res = await request("POST", "/api/uploads", { token: "user-token", body: { purpose: "post", mimeType: "application/zip", size: 10 } });
    expect(res.status).toBe(400);
    expect(contractViolations("uploads_createUploadIntent", 400, res.body)).toEqual([]);
  });
});

describe("contract bookkeeping", () => {
  it("marks exactly the operations that have a conformance test as verified", () => {
    const declared = contractOperations().filter(({ op }) => op["x-contract-status"] === "verified").map(({ op }) => op.operationId).sort();
    expect(declared).toEqual(operationsWithConformanceTests());
  });
});
