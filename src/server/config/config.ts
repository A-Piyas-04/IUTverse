import "server-only";

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// The UI and the API are served from one origin, so browsers never need CORS
// for the app itself. CORS_ORIGINS only lists *additional* browser origins
// that may call the API (a separate preview alias, for example). Wildcards are
// never accepted.
const corsOrigins = process.env.CORS_ORIGINS || "";
if (corsOrigins.includes("*")) {
  throw new Error("CORS_ORIGINS must list exact origins; '*' is not allowed");
}

// Number of reverse-proxy hops in front of the app. Vercel sets VERCEL=1 and
// overwrites X-Forwarded-For, so one hop is trusted there by default. Elsewhere
// nothing is trusted unless TRUST_PROXY says so, so clients cannot spoof their
// rate-limit key.
const parseTrustProxy = (value: string | undefined): number | false => {
  if (value === undefined || value === "") return process.env.VERCEL ? 1 : false;
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
};

const int = (value: string | undefined, fallback: number) => parseInt(value ?? "", 10) || fallback;

const config = {
  nodeEnv,
  isProduction,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  redisUrl: process.env.REDIS_URL || null,
  security: {
    corsOrigins,
    corsAllowCredentials: process.env.CORS_ALLOW_CREDENTIALS === "true",
    rateLimitWindowMinutes: int(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    rateLimitGeneralMax: int(process.env.RATE_LIMIT_GENERAL_MAX, 300),
    rateLimitAuthMax: int(process.env.RATE_LIMIT_AUTH_MAX, 10),
    rateLimitCreateMax: int(process.env.RATE_LIMIT_CREATE_MAX, 60),
    rateLimitLookupMax: int(process.env.RATE_LIMIT_LOOKUP_MAX, 20),
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Address browsers use for Supabase when it differs from SUPABASE_URL,
    // e.g. in Docker the server calls http://kong:8000 but browsers need localhost.
    publicUrl: process.env.SUPABASE_PUBLIC_URL || null,
  },
  auth: {
    // Must also be on the Supabase Auth redirect allowlist (exact URL).
    passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL || null,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || "gmail",
  },
};

export default config;
