// Direct-to-Storage uploads: intent creation and the claim that every upload
// route runs before a database row may reference the object.
const harness = require("../helpers/app");
const test = require("node:test");
const assert = require("node:assert/strict");

const { USERS, db, request, resetStubs, storage } = harness;
const { uploadObject } = require("../../src/services/storageService");

const USER = USERS["user-token"].id;
const OTHER = USERS["mod-token"].id;
const MB = 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PDF = Buffer.from("%PDF-1.7\n");
const padded = (head, size) => Buffer.concat([head, Buffer.alloc(Math.max(size - head.length, 0), 0x20)]);

const intent = (body, token = "user-token") => request("POST", "/api/uploads", { token, body });
const eventBody = (uploadPath) => ({ title: "Talk", description: "About things", location: "Hall", eventDate: "2026-11-01T10:00:00Z", uploadPath });
const insertsInto = (table) => db.calls.filter((call) => call.table === table && call.ops.some(([name]) => name === "insert"));

test.before(harness.start);
test.after(harness.stop);
test.beforeEach(() => {
  resetStubs();
  db.handler = (table, ops) => {
    if (table === "conversation_participants") return { data: { id: 1 }, error: null };
    if (ops.some(([name]) => name === "insert")) return { data: { id: 77 }, error: null };
    return { data: [], error: null };
  };
});

// ------------------------------------------------------------- POST /api/uploads

test("upload intents require a signed-in member", async () => {
  const res = await request("POST", "/api/uploads", { body: { purpose: "resource", mimeType: "application/pdf", size: MB } });
  assert.equal(res.status, 401);
  assert.equal(storage.calls.length, 0);
});

test("an intent names a server-chosen path in the caller's folder", async () => {
  const res = await intent({ purpose: "resource", mimeType: "application/pdf", size: 9 * MB });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const { bucket, path, token } = res.body.data;
  assert.equal(bucket, "academic-resources");
  assert.match(path, new RegExp(`^${USER}/resource-\\d+-\\d+\\.pdf$`));
  assert.ok(token);
  assert.deepEqual(storage.calls, [["createSignedUploadUrl", "academic-resources", path]]);
});

test("intents enforce purpose, type and the per-purpose size cap", async () => {
  const cases = [
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
    assert.equal(res.status, 400, label);
  }
  assert.equal(storage.calls.length, 0, "no signed URL was issued");
});

test("chat intents require the caller to be in the conversation", async () => {
  db.handler = () => ({ data: null, error: null });
  let res = await intent({ purpose: "chat", mimeType: "application/pdf", size: MB, conversationId: 5 });
  assert.equal(res.status, 403);

  res = await intent({ purpose: "chat", mimeType: "application/pdf", size: MB });
  assert.equal(res.status, 400);

  db.handler = () => ({ data: { id: 1 }, error: null });
  res = await intent({ purpose: "chat", mimeType: "application/pdf", size: 9 * MB, conversationId: 5 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.bucket, "chat-attachments");
});

// ------------------------------------------------------------- claiming on upload routes

test("a valid stored upload is attached without uploading it again", async () => {
  const path = `${USER}/event-1700000000000-42.png`;
  storage.put("event-images", path, padded(PNG, 4.8 * MB), "image/png");

  const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const [, row] = insertsInto("events")[0].ops.find(([name]) => name === "insert");
  assert.equal(row.image_bucket, "event-images");
  assert.equal(row.image_path, path);
  assert.equal(storage.calls.some(([name]) => name === "upload"), false);
  assert.ok(storage.has("event-images", path));
});

test("a stored PDF over the old 4.5 MB body limit can be attached to a chat message", async () => {
  const path = `${USER}/message-1700000000000-7.pdf`;
  storage.put("chat-attachments", path, padded(PDF, 9 * MB), "application/pdf");

  const res = await request("POST", "/api/chat/messages", { token: "user-token", body: { conversationId: 5, content: "notes", uploadPath: path, attachmentName: "Lecture <b>4</b>.pdf" } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const [, row] = insertsInto("chat_messages")[0].ops.find(([name]) => name === "insert");
  assert.equal(row.attachment_bucket, "chat-attachments");
  assert.equal(row.attachment_path, path);
  assert.equal(row.attachment_size_bytes, 9 * MB);
  assert.equal(row.attachment_mime_type, "application/pdf");
  assert.equal(row.attachment_name, "Lecture 4.pdf");
});

test("claims reject objects outside the caller's folder or the route's purpose", async () => {
  const cases = [
    [`${OTHER}/event-1700000000000-42.png`, "another member's object"],
    [`${USER}/post-1700000000000-42.png`, "an object made for a different purpose"],
    [`${USER}/../${OTHER}/event-1700000000000-42.png`, "path traversal"],
    [`${USER}/event-1700000000000-42.png/extra`, "nested path"],
    [`${USER}/avatar.png`, "a name the API did not choose"],
  ];
  for (const [path, label] of cases) {
    storage.put("event-images", path, PNG, "image/png");
    const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
    assert.equal(res.status, 400, label);
  }
  assert.equal(insertsInto("events").length, 0);
});

test("claims reject and delete objects that fail validation", async () => {
  const cases = [
    ["html.png", Buffer.from("<html><script>alert(1)</script></html>"), "image/png", "HTML bytes declared as PNG"],
    ["mismatch.png", PNG, "image/jpeg", "declared type differs from content"],
    ["big.png", padded(PNG, 5 * MB + 1), "image/png", "over the 5 MB event cap"],
    ["jpeg.png", JPEG, "image/jpeg", "JPEG bytes under a .png name"],
    ["pdf.png", PDF, "application/pdf", "PDF into an image purpose"],
  ];
  let n = 0;
  for (const [, body, contentType, label] of cases) {
    const path = `${USER}/event-1700000000000-${(n += 1)}.png`;
    storage.put("event-images", path, body, contentType);
    const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(path) });
    assert.equal(res.status, 400, label);
    assert.equal(storage.has("event-images", path), false, `${label}: object deleted`);
  }
  assert.equal(insertsInto("events").length, 0);
});

test("claiming an object that was never uploaded fails cleanly", async () => {
  const res = await request("POST", "/api/events", { token: "user-token", body: eventBody(`${USER}/event-1700000000000-9.png`) });
  assert.equal(res.status, 400);
  assert.equal(insertsInto("events").length, 0);
});

test("a request cannot carry both a file and an uploadPath", async () => {
  // The referenced object is valid, so only the both-at-once rule rejects this.
  const path = `${USER}/event-1700000000000-1.png`;
  storage.put("event-images", path, PNG, "image/png");
  const form = new FormData();
  for (const [key, value] of Object.entries(eventBody(path))) form.append(key, value);
  form.append("image", new Blob([PNG], { type: "image/png" }), "a.png");
  const res = await request("POST", "/api/events", { token: "user-token", form });
  assert.equal(res.status, 400);
  assert.equal(insertsInto("events").length, 0);
});

test("small multipart uploads still work and go through magic-byte validation", async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries(eventBody())) if (value !== undefined) form.append(key, value);
  form.append("image", new Blob([PNG], { type: "image/png" }), "a.png");
  const res = await request("POST", "/api/events", { token: "user-token", form });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(storage.calls.filter(([name]) => name === "upload").length, 1);
});

test("a stored upload cannot be redirected to a different bucket", async () => {
  await assert.rejects(
    uploadObject({ bucket: "post-media", userId: USER, file: { stored: true, bucket: "avatars", path: `${USER}/profile-1-2.png`, mimetype: "image/png", size: 10 } }),
    /does not belong/,
  );
});
