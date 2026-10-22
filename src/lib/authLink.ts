export interface AuthLinkIntent {
  /** The page was opened from a password-recovery email link. */
  recovery: boolean;
  /** Supabase's reason when the emailed link was rejected (expired, already used). */
  error: string | null;
}

export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * Supabase puts the outcome of an emailed link in the URL fragment:
 * `#access_token=…&type=recovery` on success, `#error=…&error_description=…`
 * on failure. The client library removes the fragment once it has read it, so
 * this has to be read before the client is created.
 */
export function readAuthLinkIntent(hash: string): AuthLinkIntent {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const failed = params.has("error") || params.has("error_description");
  return {
    recovery: params.get("type") === "recovery" && params.has("access_token"),
    error: failed ? params.get("error_description") || "This link is invalid or has expired." : null,
  };
}
