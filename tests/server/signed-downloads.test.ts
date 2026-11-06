// Signed downloads for native clients: the same authorization as the redirect, but answered as JSON with an expiry
// when ?redirect=false is sent, plus the expiry reported for signed uploads.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, startStorageServer, stopStorageServer, storage } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import { contractViolations } from "../helpers/contract";
import config from "@/server/config/config";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const ME = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const CONVERSATION = 42;
let attachmentRow: Record<string, unknown> | null;
let resourceRow: Record<string, unknown> | null;

beforeAll(startStorageServer);
afterAll(stopStorageServer);
beforeEach(() => {
  resetStubs();
  attachmentRow = { id: 7, conversation_id: CONVERSATION, attachment_bucket: "chat-attachments", attachment_path: `${OTHER}/message-1-1.png`, attachment_name: "a.png" };
  resourceRow = { file_bucket: "academic-resources", file_path: `${OTHER}/resource-1-1.pdf`, status: "active", uploaded_by_id: OTHER };
  db.handler = (table, ops) => {
    const maybe = ops.some(([op]) => op === "maybeSingle");
    if (table === "chat_messages") return { data: attachmentRow, error: null };
    if (table === "conversation_participants") {
      const asking = ops.find(([op, column]) => op === "eq" && column === "user_id")?.[2];
      return { data: maybe && [ME, OTHER].includes(asking) ? { id: 1 } : maybe ? null : [], error: null };
    }
    if (table === "academic_resources") return { data: resourceRow, error: null };
    return { data: [], error: null };
  };
});

describe("GET /api/chat/attachments/:messageId", () => {
  it("still redirects by default (web behavior unchanged)", async () => {
    const res = await request("GET", "/api/chat/attachments/7", { token: "user-token" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("chat-attachments/");
  });

  it("?redirect=false answers the same signed URL as JSON with an expiry", async () => {
    const redirect = await request("GET", "/api/chat/attachments/7", { token: "user-token" });
    const json = await request("GET", "/api/chat/attachments/7?redirect=false", { token: "user-token" });
    expect(json.status).toBe(200);
    expect(json.body).toMatchObject({ success: true, data: { url: redirect.headers.get("location") } });
    const expires = new Date(json.body.data.expiresAt).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 250_000);
    expect(expires).toBeLessThanOrEqual(Date.now() + 301_000);
    expect(contractViolations("chat_getAttachment", 200, json.body)).toEqual([]);
  });

  it("applies the same authorization in both modes", async () => {
    for (const suffix of ["", "?redirect=false"]) {
      expect((await request("GET", `/api/chat/attachments/7${suffix}`)).status, `anonymous${suffix}`).toBe(401);
      expect((await request("GET", `/api/chat/attachments/7${suffix}`, { token: "admin-token" })).status, `stranger${suffix}`).toBe(403);
    }
    attachmentRow = null;
    for (const suffix of ["", "?redirect=false"]) expect((await request("GET", `/api/chat/attachments/7${suffix}`, { token: "user-token" })).status).toBe(404);
  });

  it("any value other than false keeps the redirect", async () => {
    expect((await request("GET", "/api/chat/attachments/7?redirect=true", { token: "user-token" })).status).toBe(302);
    expect((await request("GET", "/api/chat/attachments/7?redirect=0", { token: "user-token" })).status).toBe(302);
  });
});

describe("GET /api/academic/resources/:id/file", () => {
  it("redirects by default and answers JSON with ?redirect=false", async () => {
    const redirect = await request("GET", "/api/academic/resources/3/file", { token: "user-token" });
    expect(redirect.status).toBe(302);
    const json = await request("GET", "/api/academic/resources/3/file?redirect=false", { token: "user-token" });
    expect(json.status).toBe(200);
    expect(json.body.data.url).toBe(redirect.headers.get("location"));
    expect(Date.parse(json.body.data.expiresAt)).toBeGreaterThan(Date.now());
    expect(contractViolations("academic_resourceFile", 200, json.body)).toEqual([]);
  });

  it("hides files that are not viewable, in both modes, and requires sign-in", async () => {
    resourceRow = { ...resourceRow, status: "deleted" };
    for (const suffix of ["", "?redirect=false"]) {
      expect((await request("GET", `/api/academic/resources/3/file${suffix}`, { token: "user-token" })).status).toBe(404);
      expect((await request("GET", `/api/academic/resources/3/file${suffix}`)).status).toBe(401);
    }
  });
});

describe("POST /api/uploads", () => {
  const intent = () => request("POST", "/api/uploads", { token: "user-token", body: { purpose: "post", mimeType: "image/png", size: 1024 } });

  it("reports when the signed upload stops working, read from the token's own expiry", async () => {
    storage.tokenExpiry = Math.floor(Date.now() / 1000) + 7200;
    const res = await intent();
    expect(res.status).toBe(201);
    expect(res.body.data.expiresAt).toBe(new Date(storage.tokenExpiry * 1000).toISOString());
    expect(contractViolations("uploads_createUploadIntent", 201, res.body)).toEqual([]);
  });

  it("gives the client-facing Storage address, not the server's internal one (Docker: kong -> localhost)", async () => {
    const saved = { ...config.supabase };
    try {
      config.supabase.url = storage.url; // what the server uses to reach Storage
      config.supabase.publicUrl = "https://files.example.org"; // what clients must use
      const res = await intent();
      expect(res.body.data.signedUrl.startsWith("https://files.example.org/upload/post-media/")).toBe(true);
      expect(res.body.data.signedUrl).not.toContain("127.0.0.1");
    } finally {
      Object.assign(config.supabase, saved);
    }
  });

  it("leaves the URL alone when no separate public address is configured (hosted Supabase)", async () => {
    const saved = { ...config.supabase };
    try {
      config.supabase.url = storage.url;
      config.supabase.publicUrl = "";
      expect((await intent()).body.data.signedUrl.startsWith(storage.url)).toBe(true);
    } finally {
      Object.assign(config.supabase, saved);
    }
  });

  it("answers null instead of guessing when the token has no readable expiry", async () => {
    storage.tokenExpiry = undefined as unknown as number;
    const res = await intent();
    expect(res.status).toBe(201);
    expect(res.body.data.expiresAt).toBeNull();
  });
});
