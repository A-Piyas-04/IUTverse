import type { NextConfig } from "next";

const projectRoot = process.cwd();

// Headers every response carries. Pages additionally get a nonce-based
// Content-Security-Policy from src/proxy.ts; API responses get a locked-down
// one below because they are JSON (or a redirect) and never render anything.
const sharedSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // The site itself may record voice messages; nothing embedded in it may.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Origin-Agent-Cluster", value: "?1" },
];

const pageSecurityHeaders = [...sharedSecurityHeaders, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }];

const apiSecurityHeaders = [
  ...sharedSecurityHeaders,
  { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "no-store" },
];

// The old SPA redirected these client-side; keep the aliases working.
const legacyAliases = [
  ["/chat", "/messages"],
  ["/opportunities", "/jobs"],
  ["/lostandfound", "/lost-and-found"],
  ["/catcorner", "/cat-corner"],
  ["/eventhub", "/events"],
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  async headers() {
    return [
      { source: "/((?!api/).*)", headers: pageSecurityHeaders },
      { source: "/api/:path*", headers: apiSecurityHeaders },
    ];
  },
  async redirects() {
    return legacyAliases.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
