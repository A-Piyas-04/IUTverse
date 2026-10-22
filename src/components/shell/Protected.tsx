"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Ui";
import { useAuth } from "@/features/auth/AuthProvider";

export function Loading() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Card padded>Loading IUTverse…</Card></main>;
}

/**
 * Pages for signed-in members. The session lives in the browser, so the check
 * happens here: while it is read the page shows a loading state, and a visitor
 * without a session is sent to the login page and returned afterwards.
 */
export function Protected({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const missingSession = !auth.loading && !auth.session;

  useEffect(() => {
    if (missingSession) router.replace(`/login?next=${encodeURIComponent(search ? `${pathname}?${search}` : pathname)}`);
  }, [missingSession, pathname, router, search]);

  if (auth.loading || missingSession) return <Loading />;
  return <>{children}</>;
}

/** Administrators and moderators only; everyone else goes home. */
export function RoleProtected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "admin" || user?.role === "mod";

  useEffect(() => {
    if (!allowed) router.replace("/");
  }, [allowed, router]);

  return allowed ? <>{children}</> : <Loading />;
}
