// Behavioral authorization tests: the real proxy, route chains and handlers,
// with Supabase and securityService stubbed (see tests/helpers/stubs.ts).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { USERS, db, resetStubs, security, securityCalls, startStorageServer, stopStorageServer } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import { canModerate, hasRole } from "@/server/middleware/authorization";
import { LOST_FOUND_PUBLIC_STATUSES, canViewContent } from "@/server/utils/contentVisibility";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const TARGET_USER = "00000000-0000-4000-8000-0000000000aa";

// Data the stubbed database returns for the "allowed" path of each endpoint.
const happyDb = (table: string, ops: any[][]) => {
  const has = (method: string) => ops.some(([name]) => name === method);
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
} as const;

// Expected status for each role. Anonymous and invalid/suspended callers are
// rejected by authentication before any role check.
const MATRIX: Record<keyof typeof ENDPOINTS, Record<"user" | "mod" | "admin", number>> = {
  listReports: { user: 403, mod: 200, admin: 200 },
  decideReport: { user: 403, mod: 200, admin: 200 },
  fileReport: { user: 201, mod: 201, admin: 201 },
  changeRole: { user: 403, mod: 403, admin: 200 },
  disclose: { user: 403, mod: 200, admin: 200 },
  listUsers: { user: 403, mod: 403, admin: 200 },
};
const ROLE_TOKENS = { user: "user-token", mod: "mod-token", admin: "admin-token" } as const;

beforeAll(startStorageServer);
afterAll(stopStorageServer);
beforeEach(() => {
  resetStubs();
  db.handler = happyDb;
});

for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
  const body = "body" in endpoint ? endpoint.body : undefined;
  const stubName = endpoint.stub;

  describe(name, () => {
    it("rejects anonymous callers with 401", async () => {
      const res = await request(endpoint.method, endpoint.path, { body });
      expect(res.status).toBe(401);
      if (stubName) expect(securityCalls[stubName]).toBeUndefined();
    });

    it("rejects an invalid token", async () => {
      const res = await request(endpoint.method, endpoint.path, { token: "forged-token", body });
      expect(res.status).toBe(403);
      if (stubName) expect(securityCalls[stubName]).toBeUndefined();
    });

    it("rejects a suspended moderator", async () => {
      const res = await request(endpoint.method, endpoint.path, { token: "suspended-mod-token", body });
      expect(res.status).toBe(403);
      if (stubName) expect(securityCalls[stubName]).toBeUndefined();
    });

    for (const [role, expected] of Object.entries(MATRIX[name as keyof typeof ENDPOINTS])) {
      it(`${role} gets ${expected}`, async () => {
        const res = await request(endpoint.method, endpoint.path, { token: ROLE_TOKENS[role as keyof typeof ROLE_TOKENS], body });
        expect(res.status, JSON.stringify(res.body)).toBe(expected);
        if (stubName) {
          if (expected >= 400) expect(securityCalls[stubName], `${stubName} must not run for ${role}`).toBeUndefined();
          else expect(securityCalls[stubName]?.[0]?.actorId, "actor is the authenticated caller").toBe(USERS[ROLE_TOKENS[role as keyof typeof ROLE_TOKENS]].id);
        }
      });
    }
  });
}

// ------------------------------------------------------------- PATCH /api/reports/:id

describe("PATCH /api/reports/:id", () => {
  it("passes a decision through unchanged to moderate_report", async () => {
    for (const decision of ["approve", "archive", "dismiss"]) {
      resetStubs();
      const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body: { decision } });
      expect(res.status).toBe(200);
      expect(securityCalls.moderateReport).toEqual([{ actorId: USERS["mod-token"].id, reportId: 5, decision }]);
    }
  });

  it("maps an older client's action field to the same decision and ignores status", async () => {
    await request("PATCH", "/api/reports/5", { token: "mod-token", body: { status: "dismissed", action: "archive" } });
    expect(securityCalls.moderateReport[0].decision).toBe("archive");
  });

  it("rejects unknown or missing decisions before reaching the database", async () => {
    for (const body of [{ decision: "delete" }, { decision: "reviewed" }, { status: "reviewed" }, {}]) {
      resetStubs();
      const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body });
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(securityCalls.moderateReport).toBeUndefined();
    }
  });

  it("requires report ids to be positive integers", async () => {
    for (const id of ["abc", "0", "-1", "1.5"]) {
      resetStubs();
      const res = await request("PATCH", `/api/reports/${id}`, { token: "mod-token", body: { decision: "archive" } });
      expect(res.status, id).toBe(400);
      expect(securityCalls.moderateReport).toBeUndefined();
    }
  });

  it("maps moderate_report errors to client statuses without leaking internals", async () => {
    const cases: [string, number][] = [["55000", 409], ["42501", 403], ["P0002", 404], ["22023", 400], ["XX000", 500]];
    for (const [code, status] of cases) {
      resetStubs();
      security.moderateReport = async () => { throw Object.assign(new Error(`db says ${code}`), { code }); };
      const res = await request("PATCH", "/api/reports/5", { token: "mod-token", body: { decision: "approve" } });
      expect(res.status, code).toBe(status);
      if (status === 500) {
        expect(res.body.message).toBe("Internal server error");
        expect(res.body.error).toBeUndefined();
      }
    }
  });
});

// ------------------------------------------------------------- GET /api/reports

describe("GET /api/reports", () => {
  it("filters the report queue by an allowed status only", async () => {
    let res = await request("GET", "/api/reports?status=pending", { token: "mod-token" });
    expect(res.status).toBe(200);
    const query = db.calls.find((call) => call.table === "content_reports")!;
    expect(query.ops.some(([name, column, value]) => name === "eq" && column === "status" && value === "pending")).toBe(true);

    res = await request("GET", "/api/reports?status=bogus", { token: "mod-token" });
    expect(res.status).toBe(400);
  });
});

// ------------------------------------------------------------- POST /api/reports

describe("POST /api/reports", () => {
  it("never sets a status on new reports, and duplicates are ignored rather than re-opened", async () => {
    const res = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 3, reason: "spam" } });
    expect(res.status).toBe(201);
    const upsert = db.calls.find((call) => call.table === "content_reports")!.ops.find(([name]) => name === "upsert")!;
    const [, row, options] = upsert;
    expect(row.status, "status comes from the column default").toBeUndefined();
    expect(row.reporter_id).toBe(USERS["user-token"].id);
    expect(options.ignoreDuplicates).toBe(true);

    resetStubs();
    db.handler = (table, ops) => (table === "content_reports" ? { data: [], error: null } : happyDb(table, ops));
    const duplicate = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 3, reason: "spam" } });
    expect(duplicate.status).toBe(200);
  });

  it("rejects reports on missing content without inserting", async () => {
    db.handler = (table, ops) => (table === "jobs" ? { data: null, error: null } : happyDb(table, ops));
    const res = await request("POST", "/api/reports", { token: "user-token", body: { entityKind: "job", entityId: 999, reason: "spam" } });
    expect(res.status).toBe(404);
    expect(db.calls.some((call) => call.table === "content_reports")).toBe(false);
  });

  it("validates report targets", async () => {
    for (const body of [{ entityKind: "profile", entityId: 1, reason: "x" }, { entityKind: "job", entityId: -2, reason: "x" }, { entityKind: "job", entityId: 3 }]) {
      resetStubs();
      const res = await request("POST", "/api/reports", { token: "user-token", body });
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });
});

// ------------------------------------------------------------- privileged security routes

describe("privileged security routes", () => {
  it("maps role-change and disclosure errors from the database to 403/400", async () => {
    security.setUserRole = async () => { throw new Error("administrators cannot change their own role"); };
    let res = await request("PATCH", `/api/admin/users/${TARGET_USER}/role`, { token: "admin-token", body: { role: "user", reason: "demotion for testing" } });
    expect(res.status).toBe(403);

    security.discloseAnonymousPostAuthor = async () => { throw new Error("moderators cannot act on reports they filed"); };
    res = await request("POST", "/api/moderation/posts/9/identity-disclosures", { token: "mod-token", body: { reportId: 5, justification: "independent review of report" } });
    expect(res.status).toBe(403);

    security.discloseAnonymousPostAuthor = async () => { throw new Error("a matching unresolved report is required"); };
    res = await request("POST", "/api/moderation/posts/9/identity-disclosures", { token: "mod-token", body: { reportId: 5, justification: "independent review of report" } });
    expect(res.status).toBe(400);
  });

  it("validates role and reason before calling the database", async () => {
    for (const body of [{ role: "owner", reason: "promotion for testing" }, { role: "mod", reason: "short" }]) {
      resetStubs();
      const res = await request("PATCH", `/api/admin/users/${TARGET_USER}/role`, { token: "admin-token", body });
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(securityCalls.setUserRole).toBeUndefined();
    }
  });
});

// ------------------------------------------------------------- authorization helpers

describe("authorization helpers", () => {
  it("canModerate is true only for mod and admin", () => {
    expect(canModerate({ role: "user" })).toBe(false);
    expect(canModerate({ role: "" })).toBe(false);
    expect(canModerate(undefined)).toBe(false);
    expect(canModerate({ role: "mod" })).toBe(true);
    expect(canModerate({ role: "admin" })).toBe(true);
    expect(hasRole({ role: "ADMIN" }, ["admin"])).toBe(true);
  });

  it("shows public states to all, other states to the owner and moderators", () => {
    const owner = { id: "owner", role: "user" };
    const other = { id: "other", role: "user" };
    const mod = { id: "mod", role: "mod" };
    expect(canViewContent({ status: "active", ownerId: "owner", viewer: undefined })).toBe(true);
    for (const status of ["archived", "flagged", "resolved"]) {
      expect(canViewContent({ status, ownerId: "owner", viewer: undefined }), status).toBe(false);
      expect(canViewContent({ status, ownerId: "owner", viewer: other }), status).toBe(false);
      expect(canViewContent({ status, ownerId: "owner", viewer: owner }), status).toBe(true);
      expect(canViewContent({ status, ownerId: "owner", viewer: mod }), status).toBe(true);
    }
    expect(canViewContent({ status: "deleted", ownerId: "owner", viewer: owner })).toBe(false);
    expect(canViewContent({ status: "deleted", ownerId: "owner", viewer: mod })).toBe(true);
    expect(canViewContent({ status: "resolved", ownerId: "owner", viewer: undefined, publicStatuses: LOST_FOUND_PUBLIC_STATUSES })).toBe(true);
  });
});
