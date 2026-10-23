import { defineConfig, devices } from "@playwright/test";

// OAuth end-to-end test against the Docker stack from docker-compose.oauth.yml
// (how to start it: docs/oauth-setup.md). Separate from the default e2e config,
// which starts `npm run dev` instead.
export default defineConfig({
  testDir: ".",
  testMatch: "*.e2e.ts",
  workers: 1,
  timeout: 60_000,
  use: {
    // Must be the stack's GOTRUE_SITE_URL host, or Supabase rejects the redirect.
    baseURL: process.env.OAUTH_E2E_WEB_URL ?? "http://localhost:28080",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // E2E_BROWSER_CHANNEL=msedge (or chrome) uses an installed browser instead of Playwright's.
        channel: process.env.E2E_BROWSER_CHANNEL || undefined,
        // The mock provider is "oidc-mock" inside Docker; the browser reaches it on the published port.
        launchOptions: { args: ["--host-resolver-rules=MAP oidc-mock 127.0.0.1"] },
      },
    },
  ],
});
