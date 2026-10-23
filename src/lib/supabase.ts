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
          updateUser: async () => ({ data: { user: null }, error: unavailable() }),
          exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: unavailable() })
        };
      }
      return undefined;
    }
  });

// Read before the client is created: the client strips the fragment from the URL.
export const authLinkHash = typeof window !== "undefined" ? window.location.hash : "";
export const authLinkIntent: AuthLinkIntent = readAuthLinkIntent(authLinkHash);

// The main client keeps the implicit flow: a password-reset email must work on
// any device, and PKCE would tie it to the browser that asked for it.
export const supabase: SupabaseClient = url && key && typeof window !== "undefined"
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : inert();

const CODE_VERIFIER_SUFFIX = "-code-verifier";
const ownsKey = (storageKey: string) => storageKey.endsWith(CODE_VERIFIER_SUFFIX);

// Lets the PKCE client below store its code verifier and nothing else, so it
// never reads, refreshes or overwrites the session the main client holds.
const codeVerifierStorage = {
  getItem: (storageKey: string) => (ownsKey(storageKey) ? window.localStorage.getItem(storageKey) : null),
  setItem: (storageKey: string, value: string) => {
    if (ownsKey(storageKey)) window.localStorage.setItem(storageKey, value);
  },
  removeItem: (storageKey: string) => {
    if (ownsKey(storageKey)) window.localStorage.removeItem(storageKey);
  },
};

/**
 * Sends the browser to the provider's sign-in page. OAuth uses PKCE, so the
 * session never travels in a URL: Supabase returns a one-time code that only
 * this browser, holding the code verifier, can exchange. Both clients are built
 * from the same project URL and so share a storage key; that is how the main
 * client finds the verifier when the callback page calls exchangeCodeForSession.
 */
export const redirectToOAuthProvider = async (
  provider: string,
  options: { redirectTo: string; queryParams?: Record<string, string> },
) => {
  if (!url || !key || typeof window === "undefined") throw unavailable();
  const pkce = createClient(url, key, {
    auth: { flowType: "pkce", storage: codeVerifierStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await pkce.auth.signInWithOAuth({ provider: provider as never, options });
  if (error) throw error;
};
