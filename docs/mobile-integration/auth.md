# Mobile authentication

How a native client signs in and calls the API. The API itself only ever sees a Supabase access token; everything before that is
Supabase Auth.

## Flow

1. The app signs in with Supabase Auth (`@supabase/supabase-js`), with the project URL and **anon** key only. Never ship the
   service-role key.
   * With a password, call `signInWithPassword`.
   * Google: `signInWithOAuth` with PKCE and a deep-link `redirectTo`, opened in a system browser session (`expo-web-browser`).
     The Google client is the existing "Web application" client whose redirect URI is the Supabase callback
     (`docs/oauth-setup.md`); no native Google client is required.
2. Persist the session in secure storage and let the Supabase client refresh it.
3. Send `Authorization: Bearer <access_token>` on every API call, taking the token from the Supabase session at request time.
4. After sign-in call `GET /api/auth/me`. It succeeds only for an **active IUTverse member**. A valid Supabase session alone is
   not membership.

## Account rules

* Sign-up is limited to `@iut-dhaka.edu` addresses by the `hook_restrict_iut_signup` database hook (also for Google).
* Password-reset and OAuth redirect URLs must be on the Supabase **Redirect URLs** allowlist as exact URLs (no wildcards). Add
  the app's deep links for each environment (`docs/vercel-deployment.md` step 6).

## Failure handling

| Response | `code` | Client action |
|---|---|---|
| 401 | `AUTH_TOKEN_REQUIRED` | The request had no token; get the session first. |
| 403 | `AUTH_TOKEN_INVALID` | Expired or invalid token. Refresh the session once and retry the request; if it fails again, sign out. |
| 403 | `MEMBERSHIP_REQUIRED` | Signed in but not an active member. Do not retry; show the membership message. |
| 403 | none | Not allowed to do this (role/ownership). |

An expired access token is a **403**, not a 401. Use `code`, not the status alone, to tell these apart.

## Endpoints

* `GET /api/auth/me`: identity and membership gate (`auth_getMe`).
* `GET /api/auth/validate`: token check (`auth_validateToken`).
* `POST /api/auth/login`, `signup`, `password/*`: used by the web client. Mobile signs in with Supabase directly; these are
  `other` priority in the contract.

## Rate limits

Limits are per client IP address. Mobile carriers often share one address among many phones; report 429 storms so per-user limits
can be considered.
