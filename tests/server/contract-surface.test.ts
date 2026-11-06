// The OpenAPI contract and the route files must describe the same API. These tests fail when a route is
// added, removed or has its authentication changed without updating docs/api.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contractOperations, spec } from "../helpers/contract";
import { request, routeTable } from "../helpers/dispatch";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const toContractPath = (pattern: string) => pattern.replace(/\[(\w+)\]/g, "{$1}");
const root = path.resolve(__dirname, "../..");

const implemented = async () => {
  const found: { key: string; file: string; method: string; source: string }[] = [];
  for (const entry of routeTable()) {
    const loaded = await import(/* @vite-ignore */ entry.file);
    const source = fs.readFileSync(entry.file, "utf8");
    for (const method of METHODS) {
      if (typeof loaded[method] === "function") {
        found.push({ key: `${method} ${toContractPath(entry.pattern)}`, file: path.relative(root, entry.file).replace(/\\/g, "/"), method, source });
      }
    }
  }
  return found;
};

describe("OpenAPI contract surface", () => {
  it("documents exactly the operations the route files export", async () => {
    const served = (await implemented()).map((item) => item.key).sort();
    const documented = contractOperations().map(({ route, method }) => `${method} ${route}`).sort();
    expect(documented.filter((key) => !served.includes(key)), "documented but not implemented").toEqual([]);
    expect(served.filter((key) => !documented.includes(key)), "implemented but not documented").toEqual([]);
  });

  it("points every operation at the route file that implements it", async () => {
    const files = new Map((await implemented()).map((item) => [item.key, item.file]));
    for (const { route, method, op } of contractOperations()) {
      expect(String(op["x-source"]).split(" -> ")[0], `${method} ${route}`).toBe(files.get(`${method} ${route}`));
    }
  });

  it("declares the same authentication the route pipeline enforces", async () => {
    const sources = new Map((await implemented()).map((item) => [item.key, item]));
    for (const { route, method, op } of contractOperations()) {
      const { source } = sources.get(`${method} ${route}`)!;
      const handlerLine = source.split("\n").find((line) => line.includes(`export const ${method} =`)) ?? "";
      const security: any[] = op.security ?? [];
      const declared = !security.length ? "none" : security.some((entry) => !Object.keys(entry).length) ? "optional" : "required";
      const actual = handlerLine.includes("authenticateToken") ? "required" : handlerLine.includes("optionalAuth") ? "optional" : "none";
      expect(declared, `${method} ${route}`).toBe(actual);
    }
  });

  it("declares required roles for the privileged operations", async () => {
    const sources = new Map((await implemented()).map((item) => [item.key, item]));
    for (const { route, method, op } of contractOperations()) {
      const line = sources.get(`${method} ${route}`)!.source.split("\n").find((l) => l.includes(`export const ${method} =`)) ?? "";
      const roles = line.includes("requireAdmin") ? ["admin"] : line.match(/requireRole\(([^)]*)\)/)?.[1].replace(/["\s]/g, "").split(",");
      expect(op["x-required-role"], `${method} ${route}`).toEqual(roles);
    }
  });

  it("answers 401 with a machine-readable code when a protected operation gets no token", async () => {
    for (const { route, method, op } of contractOperations()) {
      const security: any[] = op.security ?? [];
      if (!security.length || security.some((entry) => !Object.keys(entry).length)) continue;
      const concrete = route.replace(/\{(\w+)\}/g, (_, name) => (name === "userId" ? "00000000-0000-4000-8000-000000000001" : name === "kind" ? "post" : "1"));
      const res = await request(method, concrete);
      expect(res.status, `${method} ${route}`).toBe(401);
      expect(res.body?.code, `${method} ${route}`).toBe("AUTH_TOKEN_REQUIRED");
    }
  });

  it("is a valid 3.0 document with a semantic version", () => {
    expect(spec.openapi).toMatch(/^3\.0\./);
    expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
