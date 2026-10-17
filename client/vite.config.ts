import { createHash } from "node:crypto";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const originOf = (value?: string) => {
  try { return value ? new URL(value).origin : null; } catch { return null; }
};

// Full CSP for the built app. It is a <meta> tag so it can name the API and
// Supabase hosts from build-time env; header-only directives (frame-ancestors)
// are sent by vercel.json, and browsers enforce both policies.
function contentSecurityPolicy(env: Record<string, string>): Plugin {
  return {
    name: "iutverse-csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        // Browsers hash script text after HTML newline normalization (CRLF -> LF),
        // which matters for Windows checkouts.
        const inlineScriptHashes: string[] = [];
        const inlineScript = /<script>([\s\S]*?)<\/script>/g;
        for (let match = inlineScript.exec(html); match; match = inlineScript.exec(html)) {
          inlineScriptHashes.push(`'sha256-${createHash("sha256").update(match[1].replace(/\r\n?/g, "\n")).digest("base64")}'`);
        }
        const supabase = originOf(env.VITE_SUPABASE_URL);
        const supabaseHttp = supabase ?? "https://*.supabase.co";
        const supabaseWs = supabase ? supabase.replace(/^http/, "ws") : "wss://*.supabase.co";
        const api = originOf(env.VITE_API_BASE_URL);
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${inlineScriptHashes.join(" ")}`.trim(),
          "style-src 'self' 'unsafe-inline'",
          `img-src 'self' data: blob: ${supabaseHttp}`,
          `media-src 'self' blob: ${supabaseHttp}`,
          `connect-src 'self' ${[api, supabaseHttp, supabaseWs].filter(Boolean).join(" ")}`,
          "font-src 'self' data:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ");
        return { html, tags: [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" }] };
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  // On Vercel the client is static and the API is another host, so a build
  // without the absolute API base would ship a client that cannot reach it.
  if (process.env.VERCEL && !env.VITE_API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL must be set for Vercel builds (e.g. https://api.example.com/api)");
  }

  return {
    plugins: [react(), contentSecurityPolicy(env)],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: 5174,
      // Local development only; deployed builds use VITE_API_BASE_URL. The
      // default is 127.0.0.1, not localhost, so Windows/WSL cannot route the
      // request to an IPv6 listener that is not the API.
      proxy: {
        "/api": { target: process.env.DEV_API_TARGET || "http://127.0.0.1:3000", changeOrigin: true },
        "/files": { target: process.env.DEV_API_TARGET || "http://127.0.0.1:3000", changeOrigin: true }
      }
    },
    build: {
      target: "es2022",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            data: ["@tanstack/react-query", "@supabase/supabase-js"],
            forms: ["react-hook-form", "zod", "@hookform/resolvers"]
          }
        }
      }
    }
  };
});
