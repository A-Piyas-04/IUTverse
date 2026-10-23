import type { ReactNode } from "react";
import { Archivo } from "next/font/google";

// One family for the sign-in pages, used at two widths: expanded and heavy for
// the name, normal for everything else. next/font self-hosts the files, so the
// page CSP (font-src 'self') needs no change.
const archivo = Archivo({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-auth",
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={archivo.variable}>{children}</div>;
}
