# Vercel deployment

IUTverse deploys as **one** Vercel project: a Next.js app that serves the pages and the API (`/api/*`) from the same origin. Create the project from the repository root (Root Directory empty, Framework Preset *Next.js*). `vercel.json` raises the API functions' `maxDuration` to 30 seconds; everything else is detected.

The repository-root `.vercelignore` keeps docs, Docker files, migration scripts and local tooling out of a CLI deployment.

## Before the first deploy

1. Apply `supabase/migrations/202610160001_security_audit_remediation.sql`
   to the hosted project from a trusted machine (`npm run migrate:supabase`).
2. In the Supabase dashboard, under Auth → URL Configuration:
   - Set **Site URL** to the production URL.
   - Set **Redirect URLs** to exact URLs only: the production URL and
     each stable preview alias. Do not use `**` wildcards.
3. In the Supabase dashboard, under Auth → Rate Limits, review the sign-in,
   sign-up and reset limits. The browser signs in with Supabase directly, so the
   API's own auth limiter never sees those attempts. Enable CAPTCHA for sign-up
   and password reset.
4. Use a separate Supabase project for Preview deployments. Otherwise every
   preview runs with production service-role access.
5. Create a Redis database (for example Upstash) and copy its `rediss://` URL.

## Environment variables

Scope Production and Preview separately.

| Variable | Notes |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server-side Supabase access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Inlined into the browser bundle **at build time**, so they must be set before the build. Public by design. |
| `REDIS_URL` | Shared rate-limit counters and weather cache. Without it, limits are per instance. Sensitive. |
| `CORS_ORIGINS` | Optional. Extra exact browser origins allowed to call `/api`. The app itself is same-origin and needs nothing here. `*` is rejected. |
| `PASSWORD_RESET_REDIRECT_URL` | Optional. Must also be on the Supabase redirect allowlist. |
| `LOG_LEVEL`, `RATE_LIMIT_*` | Optional tuning. |
| `EMAIL_SERVICE`, `EMAIL_USER`, `SUPPORT_EMAIL` | Issue-report email. |
| `EMAIL_PASS` | Sensitive. |
| `OPENWEATHER_API_KEY` | Sensitive. |

`TRUST_PROXY` defaults to `1` on Vercel. Vercel overwrites `X-Forwarded-For`, so the client address used for rate limiting is the real one.

Never prefix a secret with `NEXT_PUBLIC_`. Everything with that prefix ships to the browser.

Never set these on Vercel. They are only for migration and provisioning scripts, which run from a trusted machine or CI:
`DATABASE_URL`, `DIRECT_URL`, `BOOTSTRAP_ADMIN_EMAILS`,
`BOOTSTRAP_MODERATOR_EMAILS`, `PRIVILEGED_ACCOUNTS_FILE`.

## Security headers

- `next.config.ts` sends `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS on every response. API responses also carry a locked-down `Content-Security-Policy` and `Cache-Control: no-store`.
- `src/proxy.ts` gives every page a `Content-Security-Policy` with a per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`) that names the Supabase project from `NEXT_PUBLIC_SUPABASE_URL` as the only external origin. The nonce is why pages are rendered per request instead of being statically cached. It is enforced on production builds only, because the development server needs `eval`.

## Uploads

Vercel caps request bodies at about 4.5 MB, which is less than the upload
limits (5 MB images, 10 MB PDFs and chat attachments). File bytes therefore
never pass through the API function:

1. The client calls `POST /api/uploads` with `purpose`, `mimeType`, `size`
   (plus `conversationId` for chat). The API checks the type, the
   per-purpose size cap and chat membership, then returns a Supabase signed
   upload URL for a path it chooses: `<userId>/<prefix>-<ts>-<rand>.<ext>`.
2. The browser uploads to that URL with `supabase.storage.uploadToSignedUrl`.
   Bucket `allowed_mime_types` and `file_size_limit` apply.
3. The client sends `uploadPath` to the normal route (`/api/posts`,
   `/api/academic/resources`, `/api/chat/messages`, and so on). Before any row
   references the object, the route checks the caller's folder, the route's
   prefix, the stored size, magic bytes and declared type. If any check fails,
   it deletes the object.

Multipart uploads still work for small files. Purposes and limits are defined
in `src/server/services/uploadIntentService.ts`.

The page CSP already allows `connect-src` to the Supabase origin, so the signed
upload needs no extra configuration.

## Self-hosting

`docker-compose.yml` runs the whole stack locally (Supabase services, Redis, and the app). For your own server, build the `web` image target, run it with the variables above, and put it behind a TLS-terminating reverse proxy. Set `TRUST_PROXY` to the number of proxies in front of the app so rate limiting sees real client addresses, and make sure the proxy passes `Host` (or `X-Forwarded-Host`) unchanged, because same-origin checks compare it with the browser's `Origin`.

## Known limits

- Objects uploaded to a signed URL but never claimed stay in their bucket, and
  in public buckets they are readable at their path. Content is limited by
  each bucket's type and size rules. Clean these up periodically: anything
  older than a day that no row references.
- Vercel WAF rate-limit rules are a useful second layer in front of the
  in-app limiters, especially for `/api/auth/*` and `/api/uploads`.
