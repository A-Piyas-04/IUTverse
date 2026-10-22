import { getRedis } from "../config/redis";
import config from "../config/config";
import logger from "../utils/logger";
import { ipKey } from "./clientIp";
import type { ApiContext, Step } from "./context";
import { failure } from "./responses";

export interface Hit {
  totalHits: number;
  /** Epoch milliseconds when the window ends. */
  resetTime: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<Hit>;
}

/** Fixed-window counters in process memory. On serverless this is per instance. */
export class MemoryStore implements RateLimitStore {
  private readonly hits = new Map<string, Hit>();
  private nextSweep = 0;

  async increment(key: string, windowMs: number): Promise<Hit> {
    const now = Date.now();
    if (now >= this.nextSweep) {
      for (const [stored, hit] of this.hits) if (hit.resetTime <= now) this.hits.delete(stored);
      this.nextSweep = now + windowMs;
    }
    const current = this.hits.get(key);
    if (!current || current.resetTime <= now) {
      const fresh = { totalHits: 1, resetTime: now + windowMs };
      this.hits.set(key, fresh);
      return fresh;
    }
    current.totalHits += 1;
    return current;
  }
}

// Atomic: count the hit and, on the first one (or if a crash left the key
// without a TTL), start the window.
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}
`;

// The Redis client queues commands while disconnected, so an outage would hang
// requests instead of reaching the fail-open/closed decision. Bound each increment.
export const STORE_TIMEOUT_MS = 1500;

/** Counters shared by every instance through Redis. */
export class RedisStore implements RateLimitStore {
  constructor(private readonly prefix: string, private readonly timeoutMs = STORE_TIMEOUT_MS) {}

  async increment(key: string, windowMs: number): Promise<Hit> {
    const redis = getRedis();
    if (!redis) throw new Error("Redis is not configured");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("rate-limit store timed out")), this.timeoutMs);
    });
    try {
      const reply = (await Promise.race([
        redis.eval(INCREMENT_SCRIPT, { keys: [`${this.prefix}${key}`], arguments: [String(windowMs)] }),
        timeout,
      ])) as [number, number];
      return { totalHits: Number(reply[0]), resetTime: Date.now() + Number(reply[1]) };
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface LimiterOptions {
  name: string;
  windowMs: number;
  max: number;
  message: string;
  /** Defaults to the client address. */
  keyGenerator?: (ctx: ApiContext) => string;
  /** When the shared store is unreachable: let the request through (true) or reject it (false). */
  failOpen?: boolean;
  store?: RateLimitStore;
}

const defaultKey = (ctx: ApiContext) => ipKey(ctx.ip);

/**
 * A fixed-window rate limiter as a route step. It sets the draft-6 `RateLimit-*`
 * headers on the response and answers 429 once `max` hits are used.
 */
export const makeLimiter = ({ name, windowMs, max, message, keyGenerator = defaultKey, failOpen = true, store }: LimiterOptions): Step => {
  let backing: RateLimitStore | undefined = store;
  const resolveStore = () => (backing ??= config.redisUrl ? new RedisStore(`rl:${name}:`) : new MemoryStore());

  return async (ctx) => {
    let hit: Hit;
    try {
      hit = await resolveStore().increment(keyGenerator(ctx), windowMs);
    } catch (error) {
      if (failOpen) {
        logger.error("Rate limit store failed; allowing the request", error);
        return;
      }
      throw error;
    }

    const remaining = Math.max(max - hit.totalHits, 0);
    const resetSeconds = Math.max(Math.ceil((hit.resetTime - Date.now()) / 1000), 0);
    ctx.responseHeaders.set("RateLimit-Policy", `${max};w=${Math.ceil(windowMs / 1000)}`);
    ctx.responseHeaders.set("RateLimit-Limit", String(max));
    ctx.responseHeaders.set("RateLimit-Remaining", String(remaining));
    ctx.responseHeaders.set("RateLimit-Reset", String(resetSeconds));

    if (hit.totalHits > max) {
      ctx.responseHeaders.set("Retry-After", String(resetSeconds));
      return failure(429, message);
    }
  };
};

// `next build` imports every route to collect its config; that is not a running server.
if (!config.redisUrl && config.isProduction && process.env.NEXT_PHASE !== "phase-production-build") {
  logger.warn("REDIS_URL is not set; rate limits are per instance and do not hold across serverless scale-out");
}

const minutes = (value: number) => value * 60 * 1000;
const { security } = config;

export const apiLimiter = makeLimiter({
  name: "api",
  windowMs: minutes(security.rateLimitWindowMinutes),
  max: security.rateLimitGeneralMax,
  message: "Too many API requests. Please try again later.",
});

// Credential endpoints fail closed: if the shared store is down, refuse.
export const authLimiter = makeLimiter({
  name: "auth",
  failOpen: false,
  windowMs: minutes(security.rateLimitWindowMinutes),
  max: security.rateLimitAuthMax,
  message: "Too many authentication attempts. Please try again later.",
});

export const createLimiter = makeLimiter({
  name: "create",
  windowMs: minutes(security.rateLimitWindowMinutes),
  max: security.rateLimitCreateMax,
  message: "Too many write requests. Please try again later.",
});

// Per-member limit for lookups that act as an existence oracle (sequential
// student IDs). Run after authenticate.
export const lookupLimiter = makeLimiter({
  name: "lookup",
  failOpen: false,
  windowMs: minutes(security.rateLimitWindowMinutes),
  max: security.rateLimitLookupMax,
  message: "Too many lookups. Please try again later.",
  keyGenerator: (ctx) => (ctx.user?.id ? `user:${ctx.user.id}` : `ip:${ipKey(ctx.ip)}`),
});
