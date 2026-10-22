// The Express middleware chain, rebuilt as route(): body parsing, error
// handling, 5xx sanitizing and step ordering.
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiContext, Step } from "@/server/http/context";
import { PublicError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { JSON_BODY_LIMIT } from "@/server/http/request";
import * as response from "@/server/http/responses";

const call = (handler: ReturnType<typeof route>, init: { method?: string; path?: string; headers?: Record<string, string>; body?: string; params?: Record<string, string> } = {}) =>
  handler(
    new NextRequest(`http://localhost:3000${init.path ?? "/api/x"}`, { method: init.method ?? "POST", headers: init.headers, body: init.body }),
    { params: Promise.resolve(init.params ?? {}) }
  );

const echo = route([], (ctx) => response.success({ body: ctx.body, query: ctx.query, params: ctx.params }));
const json = { "content-type": "application/json" };

afterEach(() => vi.unstubAllEnvs());

describe("body parsing", () => {
  it("parses a JSON object body", async () => {
    const res = await call(echo, { headers: json, body: JSON.stringify({ a: 1 }) });
    expect((await res.json()).data.body).toEqual({ a: 1 });
  });

  it("treats an empty JSON body and a missing body as {}", async () => {
    expect((await (await call(echo, { headers: json, body: "" })).json()).data.body).toEqual({});
    expect((await (await call(echo, { method: "GET" })).json()).data.body).toEqual({});
  });

  it("parses urlencoded forms, repeated names becoming arrays", async () => {
    const res = await call(echo, { headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1&tags=x&tags=y" });
    expect((await res.json()).data.body).toEqual({ a: "1", tags: ["x", "y"] });
  });

  it("answers 400 to malformed JSON", async () => {
    const res = await call(echo, { headers: json, body: "{" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, message: "Malformed JSON request body" });
  });

  it("answers 400 to JSON that is not an object or array", async () => {
    const res = await call(echo, { headers: json, body: '"just a string"' });
    expect(res.status).toBe(400);
  });

  it("answers 413 to a body over 1 MB, declared or not", async () => {
    const big = JSON.stringify({ password: "a".repeat(JSON_BODY_LIMIT + 1) });
    const res = await call(echo, { headers: json, body: big });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ success: false, message: "Request body too large" });

    // No content-length: the bytes themselves are counted.
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(big)); controller.close(); } });
    const streamed = await echo(
      new NextRequest("http://localhost:3000/api/x", { method: "POST", headers: json, body: stream, duplex: "half" } as ConstructorParameters<typeof NextRequest>[1]),
      { params: Promise.resolve({}) }
    );
    expect(streamed.status).toBe(413);
  });

  it("does not wait for the request stream to finish cancelling", async () => {
    // In Next's runtime the body can be one branch of a tee()'d stream, whose cancel() settles only when the other branch is cancelled too.
    const chunk = new Uint8Array(JSON_BODY_LIMIT + 10).fill(65);
    const stream = new ReadableStream({ start(controller) { controller.enqueue(chunk); }, cancel: () => new Promise<void>(() => {}) });
    const pending = echo(
      new NextRequest("http://localhost:3000/api/x", { method: "POST", headers: json, body: stream, duplex: "half" } as ConstructorParameters<typeof NextRequest>[1]),
      { params: Promise.resolve({}) }
    );
    const outcome = await Promise.race([pending, new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), 2_000))]);
    expect(outcome).not.toBe("hung");
    expect((outcome as Response).status).toBe(413);
  });

  it("parses the query, repeated keys becoming arrays", async () => {
    const res = await call(echo, { method: "GET", path: "/api/x?page=2&tag=a&tag=b" });
    expect((await res.json()).data.query).toEqual({ page: "2", tag: ["a", "b"] });
  });

  it("passes route params through", async () => {
    const res = await call(echo, { method: "GET", params: { id: "7" } });
    expect((await res.json()).data.params).toEqual({ id: "7" });
  });
});

describe("error handling", () => {
  it("turns a PublicError into its status and message", async () => {
    const res = await call(route([], () => { throw new PublicError("Not for you", 403); }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, message: "Not for you" });
  });

  it("hides the detail of an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(route([], () => { throw new Error("db password is hunter2"); }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, message: "Internal server error" });
  });

  it("replaces the body of any 5xx a handler sends, including its own message", async () => {
    const res = await call(route([], () => Response.json({ message: "Error creating profile", error: "relation \"x\" does not exist" }, { status: 500 })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, message: "Internal server error" });
  });

  it("keeps error detail only when EXPOSE_ERRORS=true outside production", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EXPOSE_ERRORS", "true");
    const res = await call(route([], () => response.serverError("Failed", "boom")));
    expect(await res.json()).toEqual({ success: false, message: "Failed", error: "boom" });
  });

  it("leaves 4xx bodies alone", async () => {
    const res = await call(route([], () => response.badRequest("Nope")));
    expect(await res.json()).toEqual({ success: false, message: "Nope" });
  });
});

describe("step order", () => {
  it("runs steps in order and stops at the first response", async () => {
    const seen: string[] = [];
    const step = (name: string, result?: Response): Step => () => { seen.push(name); return result; };
    const handler = vi.fn(() => response.success());

    const res = await call(route([step("a"), step("b", response.forbidden("no")), step("c")], handler));
    expect(res.status).toBe(403);
    expect(seen).toEqual(["a", "b"]);
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets a step hand data to the next step and the handler", async () => {
    const parse: Step = (ctx) => { ctx.body = { ...ctx.body, parsed: true }; };
    const res = await call(route([parse], (ctx: ApiContext) => response.success(ctx.body)));
    expect((await res.json()).data).toEqual({ parsed: true });
  });

  it("rejects bad JSON before any step runs", async () => {
    const step = vi.fn();
    const res = await call(route([step], () => response.success()), { headers: json, body: "{" });
    expect(res.status).toBe(400);
    expect(step).not.toHaveBeenCalled();
  });
});

describe("rate limiting", () => {
  it("counts every API request against the general limiter and reports it", async () => {
    const res = await call(route([], () => response.success()), { method: "GET" });
    expect(res.headers.get("RateLimit-Limit")).toBe("100000");
    expect(res.headers.get("RateLimit-Policy")).toMatch(/^100000;w=\d+$/);
  });

  it("skips the general limiter for the health probe", async () => {
    const res = await call(route([], () => response.success(), { unlimited: true }), { method: "GET" });
    expect(res.headers.get("RateLimit-Limit")).toBeNull();
  });
});

describe("redirects", () => {
  it("passes a redirect through with its Location header", async () => {
    const res = await call(route([], () => response.redirect("https://storage.example/o?token=1")), { method: "GET" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example/o?token=1");
  });
});
