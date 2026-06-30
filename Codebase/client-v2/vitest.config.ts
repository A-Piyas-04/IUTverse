import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"], environment: "jsdom", setupFiles: ["./src/test/setup.ts"], coverage: { reporter: ["text", "html"], thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } } }
});
