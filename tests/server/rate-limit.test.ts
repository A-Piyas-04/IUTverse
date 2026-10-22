import { describe, expect, it, vi } from "vitest";
import type { ApiContext } from "@/server/http/context";
import { MemoryStore, makeLimiter, type RateLimitStore } from "@/server/http/rateLimit";

const context = (ip = "203.0.113.7", user?: { id: string }): ApiContext =>
  ({ ip, user, responseHeaders: new Headers(), query: {}, params: {}, body: {} }) as unknown as ApiContext;

describe("makeLimiter", () => {
  it("allows up to max hits, then answers 429 with a retry hint", async () => {
    const limiter = makeLimiter({ name: "t", windowMs: 60_000, max: 2, message: "Slow down", store: new MemoryStore() });

    expect(await limiter(context())).toBeUndefined();
    expect(await limiter(context())).toBeUndefined();
    const blocked = context();
    const res = (await limiter(blocked)) as Response;
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ success: false, message: "Slow down" });
    expect(blocked.responseHeaders.get("RateLimit-Limit")).toBe("2");
    expect(blocked.responseHeaders.get("RateLimit-Remaining")).toBe("0");
    expect(blocked.responseHeaders.get("RateLimit-Policy")).toBe("2;w=60");
    expect(Number(blocked.responseHeaders.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("reports the remaining budget on allowed requests", async () => {
    const limiter = makeLimiter({ name: "t", windowMs: 60_000, max: 3, message: "x", store: new MemoryStore() });
    const ctx = context();
    await limiter(ctx);
    expect(ctx.responseHeaders.get("RateLimit-Remaining")).toBe("2");
  });

  it("counts each client separately", async () => {
    const limiter = makeLimiter({ name: "t", windowMs: 60_000, max: 1, message: "x", store: new MemoryStore() });
    expect(await limiter(context("198.51.100.1"))).toBeUndefined();
    expect(await limiter(context("198.51.100.2"))).toBeUndefined();
    expect(((await limiter(context("198.51.100.1"))) as Response).status).toBe(429);
  });

  it("groups IPv6 clients in the same /56 into one bucket", async () => {
    const limiter = makeLimiter({ name: "t", windowMs: 60_000, max: 1, message: "x", store: new MemoryStore() });
    expect(await limiter(context("2001:db8:abcd:12ff::1"))).toBeUndefined();
    expect(((await limiter(context("2001:db8:abcd:12aa::9"))) as Response).status).toBe(429);
  });

  it("starts a new window once the old one ends", async () => {
    vi.useFakeTimers();
    try {
      const limiter = makeLimiter({ name: "t", windowMs: 1_000, max: 1, message: "x", store: new MemoryStore() });
      expect(await limiter(context())).toBeUndefined();
      expect(((await limiter(context())) as Response).status).toBe(429);
      vi.advanceTimersByTime(1_001);
      expect(await limiter(context())).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("can key on the signed-in member instead of the address", async () => {
    const limiter = makeLimiter({
      name: "t", windowMs: 60_000, max: 1, message: "x", store: new MemoryStore(),
      keyGenerator: (ctx) => `user:${ctx.user?.id}`,
    });
    expect(await limiter(context("198.51.100.1", { id: "a" }))).toBeUndefined();
    expect(await limiter(context("198.51.100.1", { id: "b" }))).toBeUndefined();
    expect(((await limiter(context("198.51.100.99", { id: "a" }))) as Response).status).toBe(429);
  });

  describe("when the shared store fails", () => {
    const failing: RateLimitStore = { increment: async () => { throw new Error("redis down"); } };

    it("lets requests through if the limiter fails open", async () => {
      const limiter = makeLimiter({ name: "t", windowMs: 1_000, max: 1, message: "x", store: failing, failOpen: true });
      expect(await limiter(context())).toBeUndefined();
    });

    it("rejects with an error if the limiter fails closed", async () => {
      const limiter = makeLimiter({ name: "t", windowMs: 1_000, max: 1, message: "x", store: failing, failOpen: false });
      await expect(limiter(context())).rejects.toThrow("redis down");
    });
  });
});
