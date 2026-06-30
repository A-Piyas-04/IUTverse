const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V2 persistence migration includes saves, reports, issue reports and private attachments", () => {
  const sql = read("supabase/migrations/202606300001_frontend_v2_features.sql");
  for (const table of ["saved_items", "content_reports", "issue_reports", "conversation_contexts", "academic_resource_feedback"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.match(sql, /'chat-attachments', 'chat-attachments', false/);
});

test("V2 write endpoints require canonical authentication", () => {
  const routes = read("src/routes/v2Routes.js");
  assert.match(routes, /saved-items\/:kind\/:id", authenticateToken/);
  assert.match(routes, /post\("\/reports", authenticateToken/);
  assert.match(routes, /post\("\/events", authenticateToken/);
  assert.match(routes, /post\("\/issue-reports", authenticateToken/);
});

test("chat attachments are served through participant-authorized signed URLs", () => {
  const routes = read("src/routes/chatRoutes.js");
  const service = read("src/services/chatService.js");
  const controller = read("src/controllers/chatController.js");
  assert.match(routes, /attachments\/:messageId/);
  assert.match(service, /isParticipant\(data\.conversation_id, userId\)/);
  assert.match(controller, /storageService\.signedUrl/);
});

test("frontend V2 API is mounted without replacing existing routes", () => {
  const routes = read("src/routes/index.js");
  assert.match(routes, /router\.use\("\/api", v2Routes\)/);
  assert.match(routes, /router\.use\("\/api", postRoutes\)/);
  assert.match(routes, /router\.use\("\/api\/academic", academicResourceRoutes\)/);
});

test("post payloads expose numeric reaction summaries and authenticated ownership", () => {
  const controller = read("src/controllers/postController.js");
  const routes = read("src/routes/postRoutes.js");
  assert.match(controller, /reactionSummary/);
  assert.match(controller, /reactionCount:/);
  assert.match(controller, /currentReaction:/);
  assert.match(controller, /authorId: post\.author_id/);
  assert.match(routes, /router\.get\("\/posts", optionalAuth/);
  assert.match(routes, /router\.get\("\/posts\/:id", optionalAuth/);
});
