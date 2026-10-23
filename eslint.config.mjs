import js from "@eslint/js";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".stryker-tmp/**",
      "reports/**",
      "node_modules/**",
      // Local leftovers of the pre-Next.js layout and tooling state.
      "client/**",
      "server/**",
      ".claude/**",
      ".agents/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // Images are user uploads served from Supabase Storage, whose host varies
      // per environment; they are not run through the Next image optimizer.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Operational scripts run in Node and are CommonJS.
    files: ["scripts/**/*.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Test servers that run in Node, e.g. the mock OAuth provider.
    files: ["e2e/**/*.mjs"],
    languageOptions: { globals: globals.node },
  }
);
