// X-Client-Platform / X-Client-Version: optional, validated, diagnostic only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetStubs } from "../helpers/stubs";
import { request } from "../helpers/dispatch";
import { parseClientInfo } from "@/server/http/clientInfo";
import logger from "@/server/utils/logger";

vi.mock("@/server/config/supabase", async () => (await import("../helpers/stubs")).supabaseModule);
vi.mock("@/server/services/securityService", async () => (await import("../helpers/stubs")).securityModule);

const parse = (headers: Record<string, string>) => parseClientInfo(new Headers(headers));

describe("parseClientInfo", () => {
  it("accepts the documented platforms, case-insensitively", () => {
    for (const platform of ["web", "android", "ios"]) expect(parse({ "x-client-platform": platform })).toEqual({ platform });
    expect(parse({ "x-client-platform": " iOS " })).toEqual({ platform: "ios" });
  });

  it("accepts MAJOR.MINOR.PATCH with an optional +BUILD", () => {
    expect(parse({ "x-client-version": "1.4.0" })).toEqual({ version: "1.4.0" });
    expect(parse({ "x-client-version": "1.4.0+57" })).toEqual({ version: "1.4.0+57" });
    expect(parse({ "x-client-platform": "android", "x-client-version": "12.0.3+1234" })).toEqual({ platform: "android", version: "12.0.3+1234" });
  });

  it("returns nothing when the headers are absent", () => {
    expect(parse({})).toEqual({});
  });

  it("drops values outside the format instead of rejecting the request", () => {
    for (const platform of ["windows", "android; DROP", "web INFO forged log line", "", "x".repeat(500)]) {
      expect(parse({ "x-client-platform": platform }), JSON.stringify(platform)).toEqual({});
    }
    for (const version of ["1.4", "v1.4.0", "1.4.0-beta", "1.4.0+", "1.4.0+12345678901", "1.4.0.1", "<script>", "1.4.0 extra", "99999.0.0", "x".repeat(500)]) {
      expect(parse({ "x-client-version": version }), JSON.stringify(version)).toEqual({});
    }
  });
});

describe("request log", () => {
  let info: { mock: { calls: unknown[][] }; mockRestore: () => void };
  beforeEach(() => {
    resetStubs();
    db.handler = () => ({ data: [], error: null });
    info = vi.spyOn(logger, "info");
  });
  afterEach(() => info.mockRestore());

  const completed = () => info.mock.calls.map((call) => call[1] as Record<string, unknown>).filter((meta) => meta && "durationMs" in meta).at(-1)!;

  it("records platform and version with the request id when the client sends them", async () => {
    await request("GET", "/api/health", { headers: { "X-Client-Platform": "ios", "X-Client-Version": "1.4.0+57", "X-Request-Id": "correlate-me-0001" } });
    expect(completed()).toMatchObject({ clientPlatform: "ios", clientVersion: "1.4.0+57", requestId: "correlate-me-0001" });
  });

  it("works unchanged for clients that send no client headers (the web app)", async () => {
    const res = await request("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(completed()).not.toHaveProperty("clientPlatform");
    expect(completed()).not.toHaveProperty("clientVersion");
  });

  it("never lets a forged value into the log", async () => {
    await request("GET", "/api/health", { headers: { "X-Client-Platform": "android", "X-Client-Version": "1.0.0 FAKE" } });
    const meta = completed();
    expect(JSON.stringify(meta)).not.toContain("FAKE");
  });

  it("does not log tokens or bodies", async () => {
    await request("POST", "/api/posts", { token: "user-token", body: { content: "private text" }, headers: { "X-Client-Platform": "web" } });
    const text = JSON.stringify(info.mock.calls);
    expect(text).not.toContain("user-token");
    expect(text).not.toContain("private text");
  });
});

describe("client headers are not an authority", () => {
  beforeEach(() => resetStubs());

  it("do not change who may do what", async () => {
    for (const headers of [{} as Record<string, string>, { "X-Client-Platform": "web", "X-Client-Version": "9.9.9" }, { "X-Client-Platform": "ios", "X-Client-Version": "0.0.1" }]) {
      expect((await request("GET", "/api/auth/me", { headers })).status).toBe(401);
      expect((await request("GET", "/api/auth/me", { token: "user-token", headers })).status).toBe(200);
      expect((await request("GET", "/api/auth/users", { token: "user-token", headers })).status).toBe(403);
    }
  });
});
