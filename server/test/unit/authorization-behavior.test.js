// Behavioral authorization tests: real Express routing and middleware over
// HTTP, with Supabase and securityService stubbed (see test/helpers/app.js).
const harness = require("../helpers/app");
const test = require("node:test");
const assert = require("node:assert/strict");

const { USERS, calls, db, request, resetStubs, securityService } = harness;
const { canModerate, hasRole } = require("../../src/middleware/authorization");
const { canViewContent, LOST_FOUND_PUBLIC_STATUSES } = require("../../src/utils/contentVisibility");

const TARGET_USER = "00000000-0000-4000-8000-0000000000aa";

// Data the stubbed database returns for the "allowed" path of each endpoint.
const happyDb = (table, ops) => {
  const has = (method) => ops.some(([name]) => name === method);
  if (table === "content_reports" && has("upsert")) return { data: [{ id: 41, status: "pending" }], error: null };
  if (table === "content_reports") return { data: [], count: 0, error: null };
  if (table === "jobs" && has("maybeSingle")) return { data: { id: 3 }, error: null };
  if (table === "profiles" && ops.some(([name, , options]) => name === "select" && options?.head)) return { count: 1, error: null };
  if (table === "profiles") return { data: [{ id: TARGET_USER, display_name: "T" }], error: null };
  return { data: [], error: null };
};

const ENDPOINTS = {
  listReports: { method: "GET", path: "/api/reports", stub: null },
  decideReport: { method: "PATCH", path: "/api/reports/5", body: { decision: "archive" }, stub: "moderateReport" },
  fileReport: { method: "POST", path: "/api/reports", body: { entityKind: "job", entityId: 3, reason: "spam" }, stub: null },
  changeRole: { method: "PATCH", path: `/api/admin/users/${TARGET_USER}/role`, body: { role: "mod", reason: "promotion for testing" }, stub: "setUserRole" },
  disclose: { method: "POST", path: "/api/moderation/posts/9/identity-disclosures", body: { reportId: 5, justification: "independent review of report" }, stub: "discloseAnonymousPostAuthor" },
  listUsers: { method: "GET", path: "/api/auth/users", stub: null },
};

// Expected status for each role. Anonymous and invalid/suspended callers are
// rejected by authentication before any role check.
const MATRIX = {
  listReports: { user: 403, mod: 200, admin: 200 },
  decideReport: { user: 403, mod: 200, admin: 200 },
  fileReport: { user: 201, mod: 201, admin: 201 },
  changeRole: { user: 403, mod: 403, admin: 200 },
  disclose: { user: 403, mod: 200, admin: 200 },
  listUsers: { user: 403, mod: 403, admin: 200 },
};
const ROLE_TOKENS = { user: "user-token", mod: "mod-token", admin: "admin-token" };

test.before(harness.start);
test.after(harness.stop);
test.beforeEach(() => {
  resetStubs();
  db.handler = happyDb;
});

for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
  test(`${name}: anonymous callers get 401`, async () => {
    const res = await request(endpoint.method, endpoint.path, { body: endpoint.body });
    assert.equal(res.status, 401);
    if (endpoint.stub) assert.equal(calls[endpoint.stub], undefined);
  });

  test(`${name}: an invalid token is rejected`, async () => {
    const res = await request(endpoint.method, endpoint.path, { token: "forged-token", body: endpoint.body });
    assert.equal(res.status, 403);
    if (endpoint.stub) assert.equal(calls[endpoint.stub], undefined);
  });

  test(`${name}: a suspended moderator is rejected`, async () => {
    const res = await request(endpoint.method, endpoint.path, { token: "suspended-mod-token", body: endpoint.body });
    assert.equal(res.status, 403);
    if (endpoint.stub) assert.equal(calls[endpoint.stub], undefined);
  });

  for (const [role, expected] of Object.entries(MATRIX[name])) {
    test(`${name}: ${role} gets ${expected}`, async () => {
      const res = await request(endpoint.method, endpoint.path, { token: ROLE_TOKENS[role], body: endpoint.body });
      assert.equal(res.status, expected, JSON.stringify(res.body));
      if (endpoint.stub) {
        if (expected >= 400) assert.equal(calls[endpoint.stub], undefined, `${endpoint.stub} must not run for ${role}`);
        else assert.equal(calls[endpoint.stub]?.[0]?.actorId, USERS[ROLE_TOKENS[role]].id, "actor is the authenticated caller");
      }
    });
  }
}

// ------------------------------------------------------------- PATCH /api/reports/:id

test("a decision is passed through unchanged to moderate_report", async () => {
  for (const decision of ["approve", "archive", "dismiss"]) {
    resetStubs();
    const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body: { decision } });
    assert.equal(res.status, 200);
    assert.deepEqual(calls.moderateReport, [{ actorId: USERS["mod-token"].id, reportId: 5, decision }]);
  }
});

test("older clients' action field maps to the same decision and status is ignored", async () => {
  await request("PATCH", "/api/reports/5", { token: "mod-token", body: { status: "dismissed", action: "archive" } });
  assert.equal(calls.moderateReport[0].decision, "archive");
});

test("unknown or missing decisions are rejected before reaching the database", async () => {
  for (const body of [{ decision: "delete" }, { decision: "reviewed" }, { status: "reviewed" }, {}]) {
    resetStubs();
    const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(calls.moderateReport, undefined);
  }
});

test("report ids must be positive integers", async () => {
  for (const id of ["abc", "0", "-1", "1.5"]) {
    resetStubs();
    const res = await request("PATCH", `/api/reports/${id}`, { token: "mod-token", body: { decision: "archive" } });
    assert.equal(res.status, 400, id);
    assert.equal(calls.moderateReport, undefined);
  }
});

test("moderate_report errors map to client statuses without leaking internals", async () => {
  const cases = [["55000", 409], ["42501", 403], ["P0002", 404], ["22023", 400], ["XX000", 500]];
  for (const [code, status] of cases) {
    resetStubs();
    securityService.moderateReport = async () => { throw Object.assign(new Error(`db says ${code}`), { code }); };
    const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body: { decision: "approve" } });
    assert.equal(res.status, status, code);
    if (status === 500) {
      assert.equal(res.body.message, "Internal server error");
      assert.equal(res.body.error, undefined);
    }
  }
});

// ------------------------------------------------------------- GET /api/reports

test("the report queue filters by an allowed status only", async () => {
  let res = await request("GET", "/api/reports?status=pending", { token: "mod-token" });
  assert.equal(res.status, 200);
  const query = db.calls.find((call) => call.table === "content_reports");
  assert.ok(query.ops.some(([name, column, value]) => name === "eq" && column === "status" && value === "pending"));

  res = await request("GET", "/api/reports?status=bogus", { token: "mod-token" });
  assert.equal(res.status, 400);
});

// ------------------------------------------------------------- POST /api/reports

test("new reports never set a status and duplicates are ignored, not re-opened", async () => {
  const res = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 3, reason: "spam" } });
  assert.equal(res.status, 201);
  const upsert = db.calls.find((call) => call.table === "content_reports").ops.find(([name]) => name === "upsert");
  const [, row, options] = upsert;
  assert.equal(row.status, undefined, "status comes from the column default");
  assert.equal(row.reporter_id, USERS["user-token"].id);
  assert.equal(options.ignoreDuplicates, true);

  resetStubs();
  db.handler = (table, ops) => (table === "content_reports" ? { data: [], error: null } : happyDb(table, ops));
  const dup = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 3, reason: "spam" } });
  assert.equal(dup.status, 200);
});

test("reports on missing content are rejected without inserting", async () => {
  db.handler = (table, ops) => (table === "jobs" ? { data: null, error: null } : happyDb(table, ops));
  const res = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 999, reason: "spam" } });
  assert.equal(res.status, 404);
  assert.equal(db.calls.some((call) => call.table === "content_reports"), false);
});

test("report targets are validated", async () => {
  for (const body of [{ entityKind: "profile", entityId: 1, reason: "x" }, { entityKind: "job", entityId: -2, reason: "x" }, { entityKind: "job", entityId: 3 }]) {
    resetStubs();
    const res = await request("POST", "/api/reports", { token: "user-token", body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

// ------------------------------------------------------------- privileged security routes

test("role-change and disclosure errors from the database map to 403/400", async () => {
  securityService.setUserRole = async () => { throw new Error("administrators cannot change their own role"); };
  let res = await request("PATCH", `/api/admin/users/${TARGET_USER}/role`, { token: "admin-token", body: { role: "user", reason: "demotion for testing" } });
  assert.equal(res.status, 403);

  securityService.discloseAnonymousPostAuthor = async () => { throw new Error("moderators cannot act on reports they filed"); };
  res = await request("POST", "/api/moderation/posts/9/identity-disclosures", { token: "mod-token", body: { reportId: 5, justification: "independent review of report" } });
  assert.equal(res.status, 403);

  securityService.discloseAnonymousPostAuthor = async () => { throw new Error("a matching unresolved report is required"); };
  res = await request("POST", "/api/moderation/posts/9/identity-disclosures", { token: "mod-token", body: { reportId: 5, justification: "independent review of report" } });
  assert.equal(res.status, 400);
});

test("role changes validate role and reason before calling the database", async () => {
  for (const body of [{ role: "owner", reason: "promotion for testing" }, { role: "mod", reason: "short" }]) {
    resetStubs();
    const res = await request("PATCH", `/api/admin/users/${TARGET_USER}/role`, { token: "admin-token", body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(calls.setUserRole, undefined);
  }
});

// ------------------------------------------------------------- authorization helpers

test("canModerate is true only for mod and admin", () => {
  assert.equal(canModerate({ role: "user" }), false);
  assert.equal(canModerate({ role: "" }), false);
  assert.equal(canModerate(undefined), false);
  assert.equal(canModerate({ role: "mod" }), true);
  assert.equal(canModerate({ role: "admin" }), true);
  assert.equal(hasRole({ role: "ADMIN" }, ["admin"]), true);
});

test("content visibility: public states for all, other states for owner and moderators", () => {
  const owner = { id: "owner", role: "user" };
  const other = { id: "other", role: "user" };
  const mod = { id: "mod", role: "mod" };
  assert.equal(canViewContent({ status: "active", ownerId: "owner", viewer: undefined }), true);
  for (const status of ["archived", "flagged", "resolved"]) {
    assert.equal(canViewContent({ status, ownerId: "owner", viewer: undefined }), false, status);
    assert.equal(canViewContent({ status, ownerId: "owner", viewer: other }), false, status);
    assert.equal(canViewContent({ status, ownerId: "owner", viewer: owner }), true, status);
    assert.equal(canViewContent({ status, ownerId: "owner", viewer: mod }), true, status);
  }
  assert.equal(canViewContent({ status: "deleted", ownerId: "owner", viewer: owner }), false);
  assert.equal(canViewContent({ status: "deleted", ownerId: "owner", viewer: mod }), true);
  assert.equal(canViewContent({ status: "resolved", ownerId: "owner", viewer: undefined, publicStatuses: LOST_FOUND_PUBLIC_STATUSES }), true);
});
