require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Production must name its exact client origins (production and preview
// domains). Wildcards are never accepted.
const corsOrigins =
  process.env.CORS_ORIGINS ||
  (isProduction ? '' : "http://localhost:5173,http://localhost:5174,http://localhost:3000");
if (corsOrigins.includes('*')) {
  throw new Error("CORS_ORIGINS must list exact origins; '*' is not allowed");
}
if (isProduction && !corsOrigins.trim()) {
  throw new Error('CORS_ORIGINS must be set in production');
}

// Number of reverse-proxy hops in front of Express. Vercel sets VERCEL=1 and
// overwrites X-Forwarded-For, so one hop is trusted there by default. Locally
// nothing is trusted, so clients cannot spoof their rate-limit key.
const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return process.env.VERCEL ? 1 : false;
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
};

const config = {
  port: process.env.PORT || 3000,
  nodeEnv,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  redisUrl: process.env.REDIS_URL || null,
  security: {
    corsOrigins,
    corsAllowCredentials: process.env.CORS_ALLOW_CREDENTIALS === "true",
    rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    rateLimitGeneralMax: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || 300,
    rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,
    rateLimitCreateMax: parseInt(process.env.RATE_LIMIT_CREATE_MAX, 10) || 60,
    rateLimitLookupMax: parseInt(process.env.RATE_LIMIT_LOOKUP_MAX, 10) || 20,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  auth: {
    // Must also be on the Supabase Auth redirect allowlist (exact URL).
    passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL || null,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || 'gmail'
  },
};

module.exports = config;
