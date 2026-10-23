"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { apiUrl } from "@/lib/api";
import { RESET_PASSWORD_PATH } from "@/lib/authLink";
import { OAUTH_CALLBACK_PATH, OAUTH_PROVIDERS, rememberOAuthDestination, type OAuthProvider } from "@/lib/oauth";
import { authLinkHash, authLinkIntent, redirectToOAuthProvider, supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthValue {
  session: Session | null;
  user: Profile | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  /** Leaves the site for the provider; resolves only if the redirect could not start. */
  signInWithProvider(provider: OAuthProvider, destination: string): Promise<void>;
  /** Exchanges the code on the OAuth callback page for a session. */
  completeOAuthSignIn(code: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  changePassword(password: string): Promise<void>;
  refreshUser(): Promise<void>;
}

interface MeResponse {
  success: boolean;
  data: { id: string; email: string; displayName: string | null; role: "user" | "mod" | "admin"; membershipStatus: string };
  message?: string;
}

const AuthContext = createContext<AuthValue | null>(null);

const loadAuthoritativeProfile = async (session: Session): Promise<Profile> => {
  const response = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${session.access_token}` } });
  const payload = await response.json().catch(() => null) as MeResponse | null;
  if (!response.ok || !payload?.success || payload.data.membershipStatus !== "active") {
    throw new Error(payload?.message || "This account does not have active IUTverse membership.");
  }
  return {
    id: payload.data.id,
    email: payload.data.email,
    displayName: payload.data.displayName || payload.data.email.split("@")[0],
    role: payload.data.role,
  };
};

// A new session counts only once the API confirms active membership; otherwise it is ended.
const memberProfile = async (session: Session): Promise<Profile> => {
  try {
    return await loadAuthoritativeProfile(session);
  } catch (membershipError) {
    await supabase.auth.signOut();
    throw membershipError;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const applySession = async (next: Session | null) => {
      if (!next) {
        if (active) { setSession(null); setUser(null); setLoading(false); }
        return;
      }
      try {
        const profile = await loadAuthoritativeProfile(next);
        if (active) { setSession(next); setUser(profile); }
      } catch {
        await supabase.auth.signOut();
        if (active) { setSession(null); setUser(null); }
      } finally {
        if (active) setLoading(false);
      }
    };

    // A recovery email signs the member in with a temporary session. Send them
    // to the page where they choose the new password instead of into the app.
    const onResetPage = () => window.location.pathname === RESET_PASSWORD_PATH;
    const toResetPage = () => {
      if (!onResetPage()) router.replace(RESET_PASSWORD_PATH);
    };
    // OAuth failures also arrive as `#error=…`; the callback page reports those.
    const onOAuthCallback = window.location.pathname === OAUTH_CALLBACK_PATH;
    if ((authLinkIntent.recovery || authLinkIntent.error) && !onResetPage() && !onOAuthCallback) {
      // Landed on another page (Supabase falls back to the project's Site URL when
      // the redirect is not allowlisted). A full load keeps the link's fragment for
      // the reset page and avoids racing the signed-out route guard.
      window.location.replace(`${RESET_PASSWORD_PATH}${authLinkHash}`);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") toResetPage();
      void applySession(next);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [router]);

  const value = useMemo<AuthValue>(() => ({
    session,
    user,
    loading,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw error || new Error("Login did not create a session.");
      const profile = await memberProfile(data.session);
      setSession(data.session); setUser(profile);
    },
    async signInWithProvider(provider, destination) {
      rememberOAuthDestination(destination);
      await redirectToOAuthProvider(provider, {
        redirectTo: `${window.location.origin}${OAUTH_CALLBACK_PATH}`,
        queryParams: { ...OAUTH_PROVIDERS[provider].queryParams },
      });
    },
    async completeOAuthSignIn(code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) throw error || new Error("Sign-in did not create a session.");
      const profile = await memberProfile(data.session);
      setSession(data.session); setUser(profile);
    },
    async signUp(email, password, name) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
      if (data.session) {
        const profile = await loadAuthoritativeProfile(data.session);
        setSession(data.session); setUser(profile);
      }
    },
    async signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; setSession(null); setUser(null); },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}` });
      if (error) throw error;
    },
    async changePassword(password) { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; },
    async refreshUser() {
      if (!session) return;
      setUser(await loadAuthoritativeProfile(session));
    }
  }), [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
