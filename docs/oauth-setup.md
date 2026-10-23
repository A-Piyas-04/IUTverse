# Sign in with Google (OAuth)

IUT students and staff can sign in with their `@iut-dhaka.edu` Google account
instead of a password. The first Google sign-in creates the IUTverse account; an
existing password account with the same address is linked to it, not duplicated.

## How it works

1. The login (or sign-up) page shows **Continue with Google** when
   `NEXT_PUBLIC_OAUTH_PROVIDERS` contains `google`.
2. The browser goes to Supabase Auth (`/auth/v1/authorize`), which sends it on to
   Google. `hd=iut-dhaka.edu` makes Google offer IUT accounts first, and
   `prompt=select_account` always shows the account chooser.
3. Google returns to Supabase (`https://<project>.supabase.co/auth/v1/callback`).
   Before a new user is created, the `hook_restrict_iut_signup` hook refuses any
   address outside `@iut-dhaka.edu`. `hd` is only a hint, and the hook is what
   enforces the domain.
4. Supabase returns to `/auth/callback?code=…`. The flow uses **PKCE**: the code
   is single-use and only the browser that started the sign-in holds the code
   verifier needed to exchange it. Tokens never appear in a URL.
5. The callback page exchanges the code, checks membership through
   `GET /api/auth/me` (as a password login does), and continues to the page
   the member started from.

Code: `src/lib/oauth.ts`, `redirectToOAuthProvider` in `src/lib/supabase.ts`,
`src/features/auth/OAuthCallbackPage.tsx`, `AuthProvider.tsx`. New Google users
get their Google name as display name
(`supabase/migrations/202610230001_oauth_profile_name.sql`).

The main Supabase client keeps the implicit flow on purpose. Password-reset
emails have to work on any device, and PKCE would only let them work in the
browser that requested them. A second, short-lived client starts the OAuth
redirect in PKCE mode. It can only touch the code-verifier entries in storage.

## Manual setup for the hosted project

### 1. Create the Google OAuth client

In [Google Cloud Console](https://console.cloud.google.com/), preferably in a
project owned by an IUT Google Workspace account:

1. **APIs & Services → OAuth consent screen**: set it up.
   - User type **Internal** if the project belongs to the IUT Workspace. Only
     `@iut-dhaka.edu` accounts can then use it at all, which adds a second
     domain check. Otherwise choose **External** and publish the app. Under
     Testing status, only the listed test users can sign in.
   - App name `IUTverse`, support email, and the app's domain (the production
     domain) under *Authorized domains*, together with `supabase.co`.
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
     No sensitive scopes are needed.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, name e.g. `IUTverse Supabase`.
   - **Authorized JavaScript origins**: your production URL, e.g.
     `https://iutverse.example`, plus `http://localhost:3000` if you want to
     test from a dev machine against a local stack.
   - **Authorized redirect URIs**: the Supabase callback, exactly
     `https://<project-ref>.supabase.co/auth/v1/callback`. Get it from the
     Supabase dashboard, Auth → Sign In / Providers → Google, "Callback URL".
     For the local Docker stack, also add `http://localhost:8000/auth/v1/callback`.
3. Copy the **Client ID** and **Client secret**. Treat the secret like a
   password: never commit it and never put it in a `NEXT_PUBLIC_` variable.

### 2. Enable Google in Supabase

Supabase dashboard of the hosted project:

1. **Authentication → Sign In / Providers → Google**: enable, paste the Client
   ID and Client secret, save. Leave "Skip nonce checks" off.
2. **Authentication → URL Configuration**:
   - **Site URL** must be the production URL. Supabase accepts any redirect back
     to the Site URL's host, so the production `/auth/callback` needs no entry.
   - **Redirect URLs**: for every *other* host that should offer Google sign-in
     (stable preview aliases), add the exact URL `https://<host>/auth/callback`.
     No wildcard is needed. Supabase sends a redirect to any address that is not
     listed back to the Site URL, so it cannot be used as an open redirect.
3. **Authentication → Hooks**: confirm *Before User Created* still points to
   `public.hook_restrict_iut_signup`. It is what refuses non-IUT Google accounts.
4. Leave automatic identity linking on (the default), so a member who already
   has a password account signs in to the same account with Google.

### 3. Apply the migration

From a trusted machine with `DIRECT_URL` set for the hosted project (see
`supabase/README.md`):

```bash
npm run migrate:supabase
```

This applies `202610230001_oauth_profile_name.sql` (Google name as the display
name for new members). Sign-in works without it, but then new members are named
after their email address.

### 4. Turn on the button

On Vercel (Production, and Preview if its Supabase project has Google enabled),
set:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | `google` |

It is inlined at build time, so **redeploy** after setting it. Leave it empty to
hide the button, for example while the Supabase side is not configured.

### 5. Check it

1. Open `/login` and click **Continue with Google**. The Google chooser should
   list IUT accounts.
2. Sign in with an `@iut-dhaka.edu` account. You should land on the home page,
   signed in, with your Google name.
3. Try a personal Gmail account. You should come back to `/auth/callback` with
   "Only verified IUT email addresses may create an account." (with an Internal
   consent screen, Google refuses it first).
4. In the Supabase dashboard, Authentication → Users: the new user's provider
   is `google`.

## Local development

- **Docker stack**: set these in the shell or in a `.env` next to
  `docker-compose.yml`, then rebuild (`docker compose up -d --build`):
  `GOOGLE_OAUTH_ENABLED=true`, `GOOGLE_CLIENT_ID=…`, `GOOGLE_CLIENT_SECRET=…`,
  `OAUTH_PROVIDERS=google`. The Google client must list
  `http://localhost:8000/auth/v1/callback` as a redirect URI.
- **`supabase start`**: export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, set `enabled = true` under
  `[auth.external.google]` in `supabase/config.toml`, and add the CLI's callback
  (`http://127.0.0.1:<api port>/auth/v1/callback`) to the Google client.
- **`npm run dev`**: set `NEXT_PUBLIC_OAUTH_PROVIDERS=google` in `.env.local`.

## Tests

- Unit tests: `src/lib/oauth.test.ts`, `src/lib/supabase.test.ts`,
  `src/features/auth/OAuthCallbackPage.test.tsx`,
  `src/features/auth/AuthPage.test.tsx` (`npm test`).
- Database: `supabase/tests/oauth-signup.test.sql` (`npm run test:db` on a local
  stack): the hook refuses non-IUT Google sign-ups, and new profiles take the
  provider's name.
- End to end: `e2e/oauth/` runs the real login page, Supabase Auth and API in
  Docker. `mock-oidc.mjs`, wired in as Supabase's `keycloak` provider, stands
  in for the identity provider, so no Google credentials are needed. Google
  itself is checked up to the redirect to `accounts.google.com`: client id,
  redirect URI, `hd`, and PKCE.

  ```bash
  docker compose -p iutverse-oauth --env-file e2e/oauth/oauth.env -f docker-compose.yml -f e2e/oauth/docker-compose.oauth.yml up -d --build
  E2E_BROWSER_CHANNEL=msedge npm run test:e2e:oauth
  docker compose -p iutverse-oauth down -v
  ```

  `--env-file` keeps the stack from reading the repository's own `.env`. The
  `keycloak` provider can also be used for a real Keycloak (or other
  Keycloak-compatible) IUT single sign-on: enable it in Supabase and add
  `keycloak` to `NEXT_PUBLIC_OAUTH_PROVIDERS`.
