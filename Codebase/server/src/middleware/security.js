const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const helmet = require("helmet");
const config = require("../config/config");
const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");
const { failure } = require("../utils/responses");

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const allowedOrigins = parseOrigins(config.security.corsOrigins);
const effectiveOrigins = allowedOrigins.length ? allowedOrigins : defaultDevOrigins;

const corsGuard = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || effectiveOrigins.includes(origin)) return next();

  return failure(res, 403, "CORS origin is not allowed");
};

const corsOptions = {
  origin: (origin, callback) => callback(null, !origin || effectiveOrigins.includes(origin)),
  credentials: config.security.corsAllowCredentials,
  optionsSuccessStatus: 204,
};

const helmetMiddleware = helmet({
  contentSecurityPolicy:
    config.nodeEnv === "production"
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
            "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
            "media-src": ["'self'", "blob:", "https://*.supabase.co"],
          },
        }
      : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "no-referrer" },
});

// MemoryStore counts per process, which on serverless means per instance.
// With REDIS_URL set, all instances share counters.
if (!config.redisUrl && config.nodeEnv === "production") {
  logger.warn("REDIS_URL is not set; rate limits are per instance and do not hold across serverless scale-out");
}

// The Redis client queues commands while disconnected, so an outage would
// hang requests instead of reaching passOnStoreError. Bound each increment.
const STORE_TIMEOUT_MS = 1500;
class BoundedRedisStore extends RedisStore {
  increment(key) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("rate-limit store timed out")), STORE_TIMEOUT_MS);
    });
    return Promise.race([super.increment(key), timeout]).finally(() => clearTimeout(timer));
  }
}

const sharedStore = (prefix) => {
  const redis = getRedis();
  return redis ? new BoundedRedisStore({ prefix: `rl:${prefix}:`, sendCommand: (...args) => redis.sendCommand(args) }) : undefined;
};

// failOpen: when the shared store is unreachable, let requests through (true)
// or reject them (false). Credential and lookup limits fail closed.
const makeLimiter = ({ name, windowMs, max, message, keyGenerator, failOpen = true }) =>
  rateLimit({
    windowMs,
    max,
    store: sharedStore(name),
    passOnStoreError: failOpen,
    ...(keyGenerator ? { keyGenerator } : {}),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => failure(res, 429, message),
  });

const minutes = (value) => value * 60 * 1000;

const apiLimiter = makeLimiter({
  name: "api",
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitGeneralMax,
  message: "Too many API requests. Please try again later.",
});

const authLimiter = makeLimiter({
  name: "auth",
  failOpen: false,
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitAuthMax,
  message: "Too many authentication attempts. Please try again later.",
});

const createLimiter = makeLimiter({
  name: "create",
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitCreateMax,
  message: "Too many write requests. Please try again later.",
});

// Per-member limit for lookups that act as an existence oracle (sequential
// student IDs). Mount after authenticateToken.
const lookupLimiter = makeLimiter({
  name: "lookup",
  failOpen: false,
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitLookupMax,
  message: "Too many lookups. Please try again later.",
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`),
});

module.exports = {
  apiLimiter,
  lookupLimiter,
  authLimiter,
  corsGuard,
  corsOptions,
  createLimiter,
  helmetMiddleware,
};
