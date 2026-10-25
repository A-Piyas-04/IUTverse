import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders, evaluateCors } from "@/server/http/cors";

const originOf = (value?: string) => {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
};

const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];

/**
 * Content-Security-Policy for pages. The nonce lets Next's own scripts and the
 * theme bootstrap run while everything else inline stays blocked. Supabase
 * (auth, REST, Storage, Realtime) is the only external origin pages talk to;
 * chat GIFs are shown from KLIPY's CDN.
 */
export const contentSecurityPolicy = (nonce: string, env: Record<string, string | undefined> = process.env) => {
  const supabaseOrigins = unique([originOf(env.NEXT_PUBLIC_SUPABASE_URL), originOf(env.SUPABASE_PUBLIC_URL)]);
  const supabaseHttp = supabaseOrigins.length ? supabaseOrigins : ["https://*.supabase.co"];
  const supabaseWs = supabaseOrigins.length ? supabaseOrigins.map((origin) => origin.replace(/^http/, "ws")) : ["wss://*.supabase.co"];

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseHttp.join(" ")} https://static.klipy.com`,
    `media-src 'self' blob: ${supabaseHttp.join(" ")}`,
    `connect-src 'self' ${[...supabaseHttp, ...supabaseWs].join(" ")}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
};

const handleApi = (request: NextRequest) => {
  const decision = evaluateCors(request.headers);
  if (!decision.allowed) {
    return NextResponse.json({ success: false, message: "CORS origin is not allowed" }, { status: 403 });
  }

  const headers = decision.origin ? corsHeaders(request, decision.origin) : new Headers();
  if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  const response = NextResponse.next();
  headers.forEach((value, key) => (key.toLowerCase() === "vary" ? response.headers.append(key, value) : response.headers.set(key, value)));
  return response;
};

const handlePage = (request: NextRequest) => {
  // Development needs eval and inline scripts for hot reload, so the policy is
  // enforced on production builds only.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
};

export function proxy(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/") ? handleApi(request) : handlePage(request);
}

export const config = {
  // Everything except Next's static assets. Prefetches skip the CSP work.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
