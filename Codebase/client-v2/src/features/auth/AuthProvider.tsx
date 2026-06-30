import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
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
}

const AuthContext = createContext<AuthValue | null>(null);

const toProfile = (session: Session | null): Profile | null => session?.user ? {
  id: session.user.id,
  email: session.user.email,
  displayName: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "IUT member",
  role: session.user.user_metadata?.role || "user"
} : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setLoading(false); }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    session,
    user: toProfile(session),
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, name) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
    },
    async signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; },
    async resetPassword(email) { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) throw error; },
    async changePassword(password) { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; }
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
