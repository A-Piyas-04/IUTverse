import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readAuthLinkIntent, type AuthLinkIntent } from "./authLink";

// NEXT_PUBLIC_* values are inlined into the browser bundle at build time; both
// are public by design (project URL and anon key). Read them by their literal
// names so the bundler can replace them.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const unavailable = () => new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");

// The session lives in the browser. During server rendering (and when the
// project is not configured) an inert client stands in, so importing this
// module never opens a connection or a refresh timer on the server.
const inert = () =>
  new Proxy({} as SupabaseClient, {
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

// Read before the client is created: the client strips the fragment from the URL.
export const authLinkHash = typeof window !== "undefined" ? window.location.hash : "";
export const authLinkIntent: AuthLinkIntent = readAuthLinkIntent(authLinkHash);

export const supabase: SupabaseClient = url && key && typeof window !== "undefined"
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : inert();
