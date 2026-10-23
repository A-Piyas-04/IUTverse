import { safeDestination } from "./redirect";

/** Where Supabase Auth sends the browser back after the provider's consent screen. */
export const OAUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Providers the login page can offer, with the button label and the query
 * parameters passed through to the provider. `hd` only preselects IUT accounts
 * on Google's account chooser; the before_user_created hook is what actually
 * refuses addresses outside @iut-dhaka.edu.
 */
export const OAUTH_PROVIDERS = {
  google: { label: "Google", queryParams: { hd: "iut-dhaka.edu", prompt: "select_account" } },
  keycloak: { label: "single sign-on", queryParams: {} },
} as const satisfies Record<string, { label: string; queryParams: Record<string, string> }>;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

const isOAuthProvider = (value: string): value is OAuthProvider => Object.hasOwn(OAUTH_PROVIDERS, value);

/**
 * The providers switched on for this deployment, from NEXT_PUBLIC_OAUTH_PROVIDERS
 * (comma-separated, e.g. "google"). A provider must also be enabled in Supabase
 * Auth; listing one that is not makes its button fail, so unknown names are dropped.
 */
export const enabledOAuthProviders = (value: string | undefined = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS): OAuthProvider[] => [
  ...new Set(
    (value ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(isOAuthProvider),
  ),
];

export interface OAuthCallback {
  /** One-time authorization code to exchange for a session (PKCE). */
  code: string | null;
  /** Why Supabase or the provider turned the sign-in down. */
  error: string | null;
}

/**
 * Supabase returns `?code=…` on success. Failures (consent denied, an address the
 * signup hook refuses) come back as `error`/`error_description`, in the query, the
 * fragment, or both depending on where in the flow they happened.
 */
export function readOAuthCallback(search: string, hash: string): OAuthCallback {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const read = (name: string) => query.get(name) || fragment.get(name);
  const failed = read("error") || read("error_description") || read("error_code");
  if (failed) {
    return { code: null, error: read("error_description")?.replace(/\+/g, " ") || "Sign-in was cancelled or refused." };
  }
  return { code: query.get("code"), error: null };
}

// The page to return to after the provider round trip. Kept in sessionStorage
// rather than the redirect URL, so the URL Supabase redirects to stays one fixed,
// allowlisted address.
const DESTINATION_KEY = "iutverse-oauth-next";

export const rememberOAuthDestination = (destination: string) => {
  try {
    window.sessionStorage.setItem(DESTINATION_KEY, safeDestination(destination));
  } catch {
    // Storage blocked: the member lands on the home page instead.
  }
};

export const takeOAuthDestination = () => {
  try {
    const value = window.sessionStorage.getItem(DESTINATION_KEY);
    window.sessionStorage.removeItem(DESTINATION_KEY);
    return safeDestination(value);
  } catch {
    return safeDestination(null);
  }
};
