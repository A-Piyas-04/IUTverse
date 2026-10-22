// The API contract the old Express server exposed must survive the move to
// Route Handlers: same methods, same URLs, same authentication gates.
import { describe, expect, it } from "vitest";
import { LEGACY_API_SURFACE } from "../helpers/legacy-surface";
import { dispatch, makeRequest, matchRoute, routeTable } from "../helpers/dispatch";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const shape = (pattern: string) => pattern.replace(/\[[A-Za-z]+\]/g, ":p");

const exportedEndpoints = async () => {
  const endpoints: { method: string; pattern: string; shape: string }[] = [];
  for (const entry of routeTable()) {
    const loaded = await import(/* @vite-ignore */ entry.file);
    for (const method of METHODS) if (typeof loaded[method] === "function") endpoints.push({ method, pattern: entry.pattern, shape: `${method} ${shape(entry.pattern)}` });
    const unknown = Object.keys(loaded).filter((name) => /^[A-Z]+$/.test(name) && !(METHODS as readonly string[]).includes(name));
    expect(unknown, `${entry.pattern} exports unsupported methods`).toEqual([]);
  }
  return endpoints;
};

// Reachable without signing in. Everything else must answer 401 to an anonymous caller.
const PUBLIC_ENDPOINTS = new Set([
  "GET /api/health",
  "POST /api/auth/signup",
  "POST /api/auth/login",
  "POST /api/auth/password/reset-request",
  "GET /api/academic/departments",
  "GET /api/campus/weather",
  // Lost & found and confession reads are open (optional auth); see docs/backend-structure.md.
  "GET /api/lost-and-found",
  "GET /api/lost-and-found/:p",
  "GET /api/confessions",
  "GET /api/confessions/random",
  "GET /api/confessions/analytics",
  "GET /api/confessions/:p",
]);

describe("API surface", () => {
  it("serves every endpoint the Express API did, and only the health probe more", async () => {
    const served = (await exportedEndpoints()).map((endpoint) => endpoint.shape).sort();
    expect(served.filter((entry) => !LEGACY_API_SURFACE.includes(entry))).toEqual(["GET /api/health"]);
    expect(LEGACY_API_SURFACE.filter((entry) => !served.includes(entry))).toEqual([]);
    expect(new Set(served).size).toBe(served.length);
  });

  it("has one route file per URL pattern", () => {
    const patterns = routeTable().map((entry) => shape(entry.pattern) + "|" + entry.pattern.replace(/\[[A-Za-z]+\]/g, "[x]"));
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("prefers static segments over dynamic ones like Express route order did", () => {
    const pick = (pathname: string) => matchRoute(pathname)?.entry.pattern;
    expect(pick("/api/profile/me")).toBe("/api/profile/me");
    expect(pick("/api/profile/123e4567-e89b-12d3-a456-426614174000")).toBe("/api/profile/[userId]");
    expect(pick("/api/confessions/random")).toBe("/api/confessions/random");
    expect(pick("/api/confessions/7")).toBe("/api/confessions/[id]");
    expect(pick("/api/confessions/polls/4/user-voted")).toBe("/api/confessions/polls/[pollId]/user-voted");
    expect(pick("/api/jobs/comments/9")).toBe("/api/jobs/comments/[commentId]");
    expect(pick("/api/jobs/3/comments")).toBe("/api/jobs/[id]/comments");
    expect(pick("/api/user/student-id")).toBe("/api/user/student-id");
    expect(pick("/api/user/by-student-id/ABC")).toBe("/api/user/by-student-id/[studentId]");
    expect(pick("/api/nothing/here")).toBeUndefined();
  });

  it("answers 401 to anonymous callers on every endpoint that is not explicitly public", async () => {
    const checked: string[] = [];
    for (const endpoint of await exportedEndpoints()) {
      if (PUBLIC_ENDPOINTS.has(endpoint.shape)) continue;
      const url = endpoint.pattern.replace(/\[[A-Za-z]+\]/g, "1");
      const res = await dispatch(makeRequest(endpoint.method, url));
      expect(res.status, `${endpoint.method} ${endpoint.pattern}`).toBe(401);
      checked.push(endpoint.shape);
    }
    expect(checked.length).toBeGreaterThan(100);
  });

  it("serves the health probe without a token", async () => {
    const res = await dispatch(makeRequest("GET", "/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
