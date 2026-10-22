import config from "../config/config";

const parseOrigins = (value: string) =>
  value
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

const configured = parseOrigins(config.security.corsOrigins);
// Outside production an empty list falls back to the usual local dev origins.
// In production an empty list means same-origin only.
const extraOrigins = configured.length ? configured : config.isProduction ? [] : defaultDevOrigins;

const hostOf = (origin: string) => {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
};

/**
 * The page and the API share an origin, so a browser request whose Origin is
 * this server's own host is always fine. Browsers set Origin themselves and
 * scripts on other sites cannot forge Host, so this does not widen access.
 */
const isSameOrigin = (origin: string, headers: Headers) => {
  const host = headers.get("x-forwarded-host")?.split(",")[0].trim() || headers.get("host");
  return Boolean(host) && hostOf(origin) === host;
};

export type CorsDecision = { allowed: true; origin: string | null } | { allowed: false };

export const evaluateCors = (headers: Headers): CorsDecision => {
  const origin = headers.get("origin");
  if (!origin) return { allowed: true, origin: null };
  if (isSameOrigin(origin, headers) || extraOrigins.includes(origin)) return { allowed: true, origin };
  return { allowed: false };
};

/** What the `cors` package sent for an allowed origin, including the preflight answer. */
export const corsHeaders = (request: Request, origin: string): Headers => {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
  if (config.security.corsAllowCredentials) headers.set("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    const requested = request.headers.get("access-control-request-headers");
    if (requested) {
      headers.set("Access-Control-Allow-Headers", requested);
      headers.append("Vary", "Access-Control-Request-Headers");
    }
    headers.set("Content-Length", "0");
  }
  return headers;
};
