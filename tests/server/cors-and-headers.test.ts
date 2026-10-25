import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { proxy, contentSecurityPolicy } from "@/proxy";
import { corsHeaders, evaluateCors } from "@/server/http/cors";

const apiRequest = (headers: Record<string, string> = {}, method = "GET", path = "/api/health") =>
  new NextRequest(`http://localhost:3000${path}`, { method, headers: { host: "localhost:3000", ...headers } });

describe("CORS policy", () => {
  it("treats requests without an Origin header as non-browser callers", () => {
    expect(evaluateCors(new Headers({ host: "localhost:3000" }))).toEqual({ allowed: true, origin: null });
  });

  it("always allows the application's own origin", () => {
    expect(evaluateCors(new Headers({ host: "iutverse.example", origin: "https://iutverse.example" }))).toEqual({ allowed: true, origin: "https://iutverse.example" });
  });

  it("uses the forwarded host behind a proxy", () => {
    const headers = new Headers({ host: "internal:3000", "x-forwarded-host": "iutverse.example", origin: "https://iutverse.example" });
    expect(evaluateCors(headers).allowed).toBe(true);
  });

  it("allows listed origins and rejects the rest", () => {
    expect(evaluateCors(new Headers({ host: "localhost:3000", origin: "http://localhost:5174" })).allowed).toBe(true);
    expect(evaluateCors(new Headers({ host: "localhost:3000", origin: "https://evil.example" })).allowed).toBe(false);
  });

  it("answers preflights the way the cors package did", () => {
    const request = apiRequest({ origin: "http://localhost:5174", "access-control-request-headers": "authorization,content-type" }, "OPTIONS");
    const headers = corsHeaders(request, "http://localhost:5174");
    expect(headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5174");
    expect(headers.get("Access-Control-Allow-Methods")).toBe("GET,HEAD,PUT,PATCH,POST,DELETE");
    expect(headers.get("Access-Control-Allow-Headers")).toBe("authorization,content-type");
    expect(headers.get("Vary")).toContain("Origin");
    expect(headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});

describe("proxy", () => {
  it("rejects an unapproved browser origin before the route runs", async () => {
    const res = await proxy(apiRequest({ origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, message: "CORS origin is not allowed" });
  });

  it("answers an allowed preflight with 204 and no body", async () => {
    const res = await proxy(apiRequest({ origin: "http://localhost:5174", "access-control-request-method": "POST" }, "OPTIONS"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5174");
  });

  it("lets allowed requests continue and tags the response with the origin", async () => {
    const res = await proxy(apiRequest({ origin: "http://localhost:5174" }));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5174");
  });

  it("does not touch page requests outside production", async () => {
    const res = await proxy(new NextRequest("http://localhost:3000/login"));
    expect(res.headers.get("Content-Security-Policy")).toBeNull();
  });
});

describe("Content-Security-Policy", () => {
  const policy = contentSecurityPolicy("abc123", { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co/", SUPABASE_PUBLIC_URL: "" });

  it("only runs scripts that carry the request nonce", () => {
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("names Supabase as the one external origin, for HTTP and WebSocket", () => {
    expect(policy).toContain("connect-src 'self' https://proj.supabase.co wss://proj.supabase.co");
    expect(policy).toContain("img-src 'self' data: blob: https://proj.supabase.co https://static.klipy.com");
  });

  it("blocks plugins, framing and foreign form targets", () => {
    for (const directive of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) expect(policy).toContain(directive);
  });

  it("falls back to any Supabase project when none is configured", () => {
    expect(contentSecurityPolicy("n", {})).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
  });
});

describe("response headers from next.config", () => {
  it("does not advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sends the security headers on API and page responses", async () => {
    const rules = await nextConfig.headers!();
    const forPath = (source: string) => Object.fromEntries(rules.filter((rule) => rule.source === source).flatMap((rule) => rule.headers.map((header) => [header.key, header.value])));
    const api = forPath("/api/:path*");
    const pages = forPath("/((?!api/).*)");

    for (const headers of [api, pages]) {
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
      expect(headers["Permissions-Policy"]).toContain("camera=()");
    }
    expect(api["Content-Security-Policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(api["Cache-Control"]).toBe("no-store");
    expect(api["Cross-Origin-Resource-Policy"]).toBe("cross-origin");
    expect(pages["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("keeps the legacy client-side route aliases", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects.map(({ source, destination }) => [source, destination])).toEqual([
      ["/chat", "/messages"],
      ["/opportunities", "/jobs"],
      ["/lostandfound", "/lost-and-found"],
      ["/catcorner", "/cat-corner"],
      ["/eventhub", "/events"],
    ]);
  });
});
