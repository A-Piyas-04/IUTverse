"use client";

import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Loading, Protected } from "@/components/shell/Protected";

// Everything inside (app) is for signed-in members.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <Protected>
        <AppShell>{children}</AppShell>
      </Protected>
    </Suspense>
  );
}
