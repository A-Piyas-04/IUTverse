import { defineConfig, devices } from "@playwright/test";

// Messaging end to end against the Docker stack from e2e/oauth (see
// docs/oauth-setup.md for starting it): two members, two browsers, real
// Supabase Realtime, Storage and receipts.
export default defineConfig({
  testDir: ".",
  testMatch: "*.e2e.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.CHAT_E2E_WEB_URL ?? "http://localhost:28080",
    trace: "retain-on-failure",
    permissions: ["microphone"],
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.E2E_BROWSER_CHANNEL || undefined,
        // A fake microphone (a beep) for voice messages, without a permission prompt.
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
  ],
});
