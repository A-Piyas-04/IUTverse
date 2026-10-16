# Vercel deployment

IUTverse deploys as two Vercel projects from this repository.

| Project | Root Directory | What it serves |
|---|---|---|
| API | `Codebase/server` | Express app as one serverless function (`api/index.js`). `vercel.json` rewrites every path to it. |
| Client | `Codebase/client-v2` | Static Vite build. `vercel.json` adds the SPA fallback and security headers. |

The legacy `Codebase/client` is never deployed. It is outside both Root
Directories, and the repository-root `.vercelignore` excludes it in case the
root is ever linked as a project.

## Before the first deploy

1. Apply `Codebase/server/supabase/migrations/202610160001_security_audit_remediation.sql`
   to the hosted project from a trusted machine (`npm run migrate:supabase`).
2. In the Supabase dashboard, under Auth → URL Configuration:
   - Set **Site URL** to the production client URL.
   - Set **Redirect URLs** to exact URLs only: the production client URL and
     each stable preview alias. Do not use `**` wildcards.
3. In the Supabase dashboard, under Auth → Rate Limits, review the sign-in,
   sign-up and reset limits. The client signs in with Supabase directly, so the
   Express auth limiter never sees those attempts. Enable CAPTCHA for sign-up
   and password reset.
4. Use a separate Supabase project for Preview deployments. Otherwise every
   preview runs with production service-role access.
5. Create a Redis database (for example Upstash) and copy its `rediss://` URL.

## Environment variables

Scope Production and Preview separately.

### API project

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive |
| `CORS_ORIGINS` | Exact client origins, comma-separated: the production domain plus stable preview aliases. Required in production; `*` is rejected at startup. |
| `REDIS_URL` | Shared rate-limit counters and weather cache. Without it, limits are per instance. Sensitive. |
| `PASSWORD_RESET_REDIRECT_URL` | Optional. Must also be on the Supabase redirect allowlist. |
| `LOG_LEVEL`, `RATE_LIMIT_*` | Optional tuning |
| `EMAIL_SERVICE`, `EMAIL_USER`, `SUPPORT_EMAIL` | Issue-report email |
| `EMAIL_PASS` | Sensitive |
| `OPENWEATHER_API_KEY` | Sensitive |

`TRUST_PROXY` defaults to `1` on Vercel. Vercel overwrites `X-Forwarded-For`,
so `req.ip` is the real client.

Never set these on Vercel. They are only for migration and provisioning
scripts, which run from a trusted machine or CI:
`DATABASE_URL`, `DIRECT_URL`, `BOOTSTRAP_ADMIN_EMAILS`,
`BOOTSTRAP_MODERATOR_EMAILS`, `PRIVILEGED_ACCOUNTS_FILE`. The API project's
`.vercelignore` keeps `scripts/` and `supabase/` out of the function bundle.

### Client project

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | Absolute API base, for example `https://api.example.com/api`. The build fails on Vercel without it. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Public by design |

Never prefix a secret with `VITE_`. Everything with that prefix ships to the
browser.

## Security headers

- API: helmet sets CSP, `nosniff`, `frame-ancestors` and so on per response.
- Client: `vercel.json` sends `frame-ancestors 'none'`, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS. The
  build adds a `<meta>` CSP that names the exact API and Supabase origins from
  the build environment and pins the inline theme script by hash. Browsers
  enforce both policies.

## Known limits

- Vercel caps request bodies at about 4.5 MB. Uploads up to 10 MB (PDFs, chat
  attachments) are rejected before Express sees them. Moving uploads to
  Supabase signed upload URLs removes this limit.
- Vercel WAF rate-limit rules are a useful second layer in front of the
  Express limiters, especially for `/api/auth/*`.
