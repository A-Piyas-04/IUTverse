"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { apiUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthValue {
  session: Session | null;
  user: Profile | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { void applySession(next); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    user,
    loading,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw error || new Error("Login did not create a session.");
      try {
        const profile = await loadAuthoritativeProfile(data.session);
        setSession(data.session); setUser(profile);
      } catch (membershipError) {
        await supabase.auth.signOut();
        throw membershipError;
      }
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
    async resetPassword(email) { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) throw error; },
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
