import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // `server-only` throws when imported outside a React Server environment.
  "server-only": fileURLToPath(new URL("./tests/helpers/server-only.ts", import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    // Report only, no thresholds: the page components and the Supabase-backed services are
    // exercised end to end (e2e and the local stack), not by these unit tests.
    coverage: { reporter: ["text", "html"], include: ["src/**/*.{ts,tsx}"], exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"] },
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          // Real Supabase settings must never leak into these tests.
          setupFiles: ["./tests/helpers/env.ts"],
          // Some tests import every route module; instrumented runs need the headroom.
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
