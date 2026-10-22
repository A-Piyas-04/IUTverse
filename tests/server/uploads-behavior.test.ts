// Direct-to-Storage uploads: intent creation and the claim that every upload
// route runs before a database row may reference the object.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, startStorageServer, stopStorageServer, storage } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import { uploadObject } from "@/server/services/storageService";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const USER = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const MB = 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PDF = Buffer.from("%PDF-1.7\n");
const padded = (head: Buffer, size: number) => Buffer.concat([head, Buffer.alloc(Math.max(size - head.length, 0), 0x20)]);

const intent = (body: unknown, token = "user-token") => request("POST", "/api/uploads", { token, body });
const eventBody = (uploadPath?: string): Record<string, any> => ({ title: "Talk", description: "About things", location: "Hall", eventDate: "2026-11-01T10:00:00Z", uploadPath });
const insertsInto = (table: string) => db.calls.filter((call) => call.table === table && call.ops.some(([name]) => name === "insert"));
const insertedRow = (table: string) => insertsInto(table)[0].ops.find(([name]) => name === "insert")![1];

beforeAll(startStorageServer);
afterAll(stopStorageServer);
beforeEach(() => {
  resetStubs();
  db.handler = (table, ops) => {
    if (table === "conversation_participants") return { data: { id: 1 }, error: null };
    if (ops.some(([name]) => name === "insert")) return { data: { id: 77 }, error: null };
    return { data: [], error: null };
  };
});

// ------------------------------------------------------------- POST /api/uploads

describe("POST /api/uploads", () => {
  it("requires a signed-in member", async () => {
    const res = await request("POST", "/api/uploads", { body: { purpose: "resource", mimeType: "application/pdf", size: MB } });
    expect(res.status).toBe(401);
    expect(storage.calls).toHaveLength(0);
  });

  it("names a server-chosen path in the caller's folder", async () => {
    const res = await intent({ purpose: "resource", mimeType: "application/pdf", size: 9 * MB });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const { bucket, path, token } = res.body.data;
    expect(bucket).toBe("academic-resources");
    expect(path).toMatch(new RegExp(`^${USER}/resource-\\d+-\\d+\\.pdf$`));
    expect(token).toBeTruthy();
    expect(storage.calls).toEqual([["createSignedUploadUrl", "academic-resources", path]]);
  });

  it("enforces purpose, type and the per-purpose size cap", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ purpose: "backups", mimeType: "application/pdf", size: MB }, "unknown purpose"],
      [{ purpose: "post", mimeType: "image/svg+xml", size: MB }, "SVG into an image bucket"],
      [{ purpose: "post", mimeType: "text/html", size: MB }, "HTML"],
      [{ purpose: "resource", mimeType: "image/png", size: MB }, "image as a resource"],
      [{ purpose: "resource", mimeType: "application/pdf", size: 10 * MB + 1 }, "PDF over 10 MB"],
      [{ purpose: "avatar", mimeType: "image/png", size: 2 * MB + 1 }, "avatar over 2 MB"],
      [{ purpose: "post", mimeType: "image/png", size: 0 }, "empty file"],
      [{ purpose: "post", mimeType: "image/png" }, "missing size"],
    ];
    for (const [body, label] of cases) {
      const res = await intent(body);
      expect(res.status, label).toBe(400);
    }
    expect(storage.calls.length, "no signed URL was issued").toBe(0);
  });

  it("requires chat intents to come from a conversation participant", async () => {
    db.handler = () => ({ data: null, error: null });
    let res = await intent({ purpose: "chat", mimeType: "application/pdf", size: MB, conversationId: 5 });
    expect(res.status).toBe(403);

    res = await intent({ purpose: "chat", mimeType: "application/pdf", size: MB });
    expect(res.status).toBe(400);

    db.handler = () => ({ data: { id: 1 }, error: null });
    res = await intent({ purpose: "chat", mimeType: "application/pdf", size: 9 * MB, conversationId: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.bucket).toBe("chat-attachments");
  });
});

// ------------------------------------------------------------- claiming on upload routes

describe("claiming a stored upload", () => {
  it("attaches a valid stored upload without uploading it again", async () => {
    const path = `${USER}/event-1700000000000-42.png`;
    storage.put("event-images", path, padded(PNG, 4.8 * MB), "image/png");

    const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = insertedRow("events");
    expect(row.image_bucket).toBe("event-images");
    expect(row.image_path).toBe(path);
    expect(storage.calls.some(([name]) => name === "upload")).toBe(false);
    expect(storage.has("event-images", path)).toBe(true);
  });

  it("does not hang when cancelling the storage response body never settles", async () => {
    // In Next's runtime the fetch response can be one branch of a tee()'d stream,
    // whose cancel() settles only when the other branch is cancelled too.
    const path = `${USER}/event-1700000000000-77.png`;
    storage.put("event-images", path, padded(PNG, 64), "image/png");
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await realFetch(input, init);
      if (!String(input).startsWith(storage.url)) return res;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const body = new ReadableStream({ start(controller) { controller.enqueue(bytes); }, cancel: () => new Promise<void>(() => {}) });
      return new Response(body, { status: res.status, headers: res.headers });
    });
    try {
      const outcome = await Promise.race([
        request("POST", "/api/events", { token: "user-token", body: eventBody(path) }),
        new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), 3_000)),
      ]);
      expect(outcome).not.toBe("hung");
      expect((outcome as { status: number }).status).toBe(201);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("attaches a stored PDF over the old 4.5 MB body limit to a chat message", async () => {
    const path = `${USER}/message-1700000000000-7.pdf`;
    storage.put("chat-attachments", path, padded(PDF, 9 * MB), "application/pdf");

    const res = await request("POST", "/api/chat/messages", { token: "user-token", body: { conversationId: 5, content: "notes", uploadPath: path, attachmentName: "Lecture <b>4</b>.pdf" } });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = insertedRow("chat_messages");
    expect(row.attachment_bucket).toBe("chat-attachments");
    expect(row.attachment_path).toBe(path);
    expect(row.attachment_size_bytes).toBe(9 * MB);
    expect(row.attachment_mime_type).toBe("application/pdf");
    expect(row.attachment_name).toBe("Lecture 4.pdf");
  });

  it("rejects objects outside the caller's folder or the route's purpose", async () => {
    const cases: [string, string][] = [
      [`${OTHER}/event-1700000000000-42.png`, "another member's object"],
      [`${USER}/post-1700000000000-42.png`, "an object made for a different purpose"],
      [`${USER}/../${OTHER}/event-1700000000000-42.png`, "path traversal"],
      [`${USER}/event-1700000000000-42.png/extra`, "nested path"],
      [`${USER}/avatar.png`, "a name the API did not choose"],
    ];
    for (const [path, label] of cases) {
      storage.put("event-images", path, PNG, "image/png");
      const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
      expect(res.status, label).toBe(400);
    }
    expect(insertsInto("events")).toHaveLength(0);
  });

  it("rejects and deletes objects that fail validation", async () => {
    const cases: [Buffer, string, string][] = [
      [Buffer.from("<html><script>alert(1)</script></html>"), "image/png", "HTML bytes declared as PNG"],
      [PNG, "image/jpeg", "declared type differs from content"],
      [padded(PNG, 5 * MB + 1), "image/png", "over the 5 MB event cap"],
      [JPEG, "image/jpeg", "JPEG bytes under a .png name"],
      [PDF, "application/pdf", "PDF into an image purpose"],
    ];
    let n = 0;
    for (const [body, contentType, label] of cases) {
      n += 1;
      const path = `${USER}/event-1700000000000-${n}.png`;
      storage.put("event-images", path, body, contentType);
      const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
      expect(res.status, label).toBe(400);
      expect(storage.has("event-images", path), `${label}: object deleted`).toBe(false);
    }
    expect(insertsInto("events")).toHaveLength(0);
  });

  it("fails cleanly when the object was never uploaded", async () => {
    const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(`${USER}/event-1700000000000-9.png`) });
    expect(res.status).toBe(400);
    expect(insertsInto("events")).toHaveLength(0);
  });

  it("refuses a request that carries both a file and an uploadPath", async () => {
    // The referenced object is valid, so only the both-at-once rule rejects this.
    const path = `${USER}/event-1700000000000-1.png`;
    storage.put("event-images", path, PNG, "image/png");
    const form = new FormData();
    for (const [key, value] of Object.entries(eventBody(path))) form.append(key, value);
    form.append("image", new Blob([PNG], { type: "image/png" }), "a.png");
    const res = await request("POST", "/api/events", { token: "user-token", form });
    expect(res.status).toBe(400);
    expect(insertsInto("events")).toHaveLength(0);
  });

  it("still accepts small multipart uploads, with magic-byte validation", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(eventBody())) if (value !== undefined) form.append(key, value);
    form.append("image", new Blob([PNG], { type: "image/png" }), "a.png");
    const res = await request("POST", "/api/events", { token: "user-token", form });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(storage.calls.filter(([name]) => name === "upload")).toHaveLength(1);
  });

  it("cannot redirect a stored upload to a different bucket", async () => {
    await expect(
      uploadObject({ bucket: "post-media", userId: USER, file: { stored: true, bucket: "avatars", path: `${USER}/profile-1-2.png`, mimetype: "image/png", size: 10, originalname: "x" } }),
    ).rejects.toThrow(/does not belong/);
  });
});

// ------------------------------------------------------------- multipart limits (what multer enforced)

describe("multipart uploads", () => {
  const post = (formEntries: Record<string, string>, file?: { field: string; blob: Blob; name: string }) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(formEntries)) if (value !== undefined) form.append(key, value);
    if (file) form.append(file.field, file.blob, file.name);
    return request("POST", "/api/events", { token: "user-token", form });
  };

  it("rejects a file on an unexpected field name", async () => {
    const res = await post({ ...eventBody() } as Record<string, string>, { field: "avatar", blob: new Blob([PNG], { type: "image/png" }), name: "a.png" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Unexpected field name for file upload.");
  });

  it("rejects a file type the route does not take", async () => {
    const res = await post({ ...eventBody() } as Record<string, string>, { field: "image", blob: new Blob([PDF], { type: "application/pdf" }), name: "a.pdf" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Only image files are allowed.");
  });

  it("rejects a file over the cap", async () => {
    const res = await post({ ...eventBody() } as Record<string, string>, { field: "image", blob: new Blob([padded(PNG, 5 * MB + 1)], { type: "image/png" }), name: "big.png" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("File too large. Maximum size is 5MB.");
  });

  it("treats an empty file input as no file", async () => {
    const res = await post({ ...eventBody() } as Record<string, string>, { field: "image", blob: new Blob([], { type: "application/octet-stream" }), name: "" });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(storage.calls.filter(([name]) => name === "upload")).toHaveLength(0);
  });
});
