import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "@/styles/global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "IUTverse",
  description: "IUTverse — a dedicated social platform for the IUT community.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f6ef",
};

// Runs before first paint so a saved dark theme never flashes light. Light
// stays the accessible first-visit default.
const themeScript = `(() => {
  let theme = "light";
  try {
    const saved = localStorage.getItem("iutverse-theme");
    if (saved === "light" || saved === "dark") theme = saved;
  } catch (_) { /* Light remains the accessible first-visit default. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#f2f6ef" : "#000000";
})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading the request's headers makes every page render per request, which is
  // what lets the CSP nonce from src/proxy.ts reach this inline script.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
