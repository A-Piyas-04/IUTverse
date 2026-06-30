import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const unavailable = () => new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

export const supabase: SupabaseClient = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : new Proxy({} as SupabaseClient, {
      get(_target, property) {
        if (property === "auth") {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
            signInWithPassword: async () => ({ data: { user: null, session: null }, error: unavailable() }),
            signUp: async () => ({ data: { user: null, session: null }, error: unavailable() }),
            signOut: async () => ({ error: null }),
            resetPasswordForEmail: async () => ({ data: {}, error: unavailable() }),
            updateUser: async () => ({ data: { user: null }, error: unavailable() })
          };
        }
        return undefined;
      }
    });
