"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { brand } from "@/content/siteContent";
import { readOAuthCallback, takeOAuthDestination } from "@/lib/oauth";
import { authLinkHash } from "@/lib/supabase";
import styles from "./AuthPage.module.css";

/**
 * Where Supabase Auth returns the browser after Google (or another provider).
 * Exchanges the one-time code for a session, checks membership like a password
 * login does, then continues to the page the member started from.
 */
export function OAuthCallbackPage() {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // The code is single-use; React's development double effect must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const callback = readOAuthCallback(window.location.search, authLinkHash || window.location.hash);
    const destination = takeOAuthDestination();
    if (callback.error || !callback.code) {
      setError(callback.error || "This sign-in link is invalid or has expired.");
      return;
    }
    auth.completeOAuthSignIn(callback.code).then(
      () => router.replace(destination),
      (failure: unknown) => setError(failure instanceof Error ? failure.message : "Unable to sign in."),
    );
  }, [auth, router]);

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <div className={styles.brand}>{brand.name} / IUT community</div>
        <div className={styles.copy}>
          <h1>{brand.loginTitle}</h1>
        </div>
        <small>Verified IUT members only</small>
      </section>
      <section className={styles.formSide}>
        <div className={styles.panel}>
          <h2>{error ? "Sign-in failed" : "Signing you in"}</h2>
          {error ? (
            <>
              <div className={styles.message} role="alert">
                {error}
              </div>
              <div className={styles.switch}>
                <Link href="/login">Back to login</Link>
              </div>
            </>
          ) : (
            <p role="status">Finishing sign-in…</p>
          )}
        </div>
      </section>
    </main>
  );
}
