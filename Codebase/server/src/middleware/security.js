const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const config = require("../config/config");
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

const makeLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => failure(res, 429, message),
  });

const minutes = (value) => value * 60 * 1000;

const apiLimiter = makeLimiter({
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitGeneralMax,
  message: "Too many API requests. Please try again later.",
});

const authLimiter = makeLimiter({
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitAuthMax,
  message: "Too many authentication attempts. Please try again later.",
});

const createLimiter = makeLimiter({
  windowMs: minutes(config.security.rateLimitWindowMinutes),
  max: config.security.rateLimitCreateMax,
  message: "Too many write requests. Please try again later.",
});

module.exports = {
  apiLimiter,
  authLimiter,
  corsGuard,
  corsOptions,
  createLimiter,
  helmetMiddleware,
};
