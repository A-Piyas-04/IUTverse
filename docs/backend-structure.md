# IUTverse Backend Structure

IUTverse is one Next.js application. The pages and the HTTP API are served by the same server, under the same origin. The API is the former Express application, ported route for route: the same URLs, the same request and response bodies, the same authentication and authorization rules. Supabase remains the foundation for authentication, the database and file storage.

This document describes the API half. The pages live in `src/app` (routes only), `src/features` (one folder per feature), `src/components` (shared UI) and `src/lib`.

## Runtime Overview

- `next dev` / `next start` serve everything. `next build` produces a standalone server (`output: "standalone"`), which the Docker image runs. On Vercel the same project deploys as pages plus one function per API route.
- API requests are handled by Route Handlers in `src/app/api/**/route.ts`.
- `src/proxy.ts` runs before every request: CORS for `/api/*`, and a nonce-based Content-Security-Policy for pages (production builds).
- The server uses Supabase for authentication and token validation, database reads and writes, Storage-backed uploads, and Realtime-ready chat tables.
- The server does not use Prisma, does not serve local upload folders, and does not hash passwords itself.

## Layout

```text
src/
  proxy.ts                   CORS for /api, CSP for pages
  app/
    api/**/route.ts          one file per URL, exporting GET/POST/PUT/PATCH/DELETE
    (auth)/  (app)/          pages (see the frontend notes in the README)
  server/                    server-only code (imports "server-only")
    kit.ts                   everything a route file imports, in one place
    http/                    the Express middleware stack, rebuilt
    config/                  environment, Supabase, Redis, email
    middleware/              authentication, roles, upload claims, confession validation
    controllers/             one file per feature area
    services/                domain logic and Supabase calls
    utils/                   validation, file signatures, logging, shared mappers
supabase/                    migrations, seed data, pgTAP tests, config.toml
scripts/                     migration and provisioning jobs (run from a trusted machine)
tests/                       server tests (Vitest) and their helpers
```

## Route files

A route file describes its middleware chain in the order Express did:

```ts
// src/app/api/posts/route.ts
export const GET = route([authenticateToken], getPosts);
export const POST = route(
  [authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("post")],
  createPost
);
```

`route(steps, handler)` (in `src/server/http/route.ts`) builds the Route Handler. For every request it:

1. builds the context (`ctx.params`, `ctx.query`, `ctx.ip`, ...);
2. parses a JSON or urlencoded body (1 MB limit: `413 Request body too large`, malformed input `400 Malformed JSON request body`);
3. applies the general API rate limit;
4. runs each step in order. A step ends the request by returning a `Response`, otherwise it may fill `ctx.user`, `ctx.body`, `ctx.file`;
5. runs the handler;
6. turns a thrown `PublicError` into its status and anything else into a generic `500`;
7. replaces any `5xx` body with `Internal server error` unless `EXPOSE_ERRORS=true` outside production;
8. adds the rate-limit headers and logs the request.

Handlers are `(ctx) => Response`. The helpers in `http/responses.ts` build the standard envelopes (`success`, `created`, `badRequest`, `forbidden`, ...), and `json(status, body)` is used where an endpoint has always answered with its own shape.

Dynamic segment names must match among siblings in the Next.js file system, so job and post sub-resources use `[id]` (the Express routers used `:jobId` and `:postId` there).

## Steps

| Step | Purpose |
|---|---|
| `authenticateToken` | Reads `Authorization: Bearer <token>`, validates it with Supabase Auth, loads role and membership from the protected tables, and rejects anyone who is not an active member. Sets `ctx.user` with both `id` and `userId`. |
| `optionalAuth` | The same, but only when an `Authorization` header is present. |
| `requireAdmin`, `requireRole("admin", "mod")` | Role checks. |
| `authLimiter`, `createLimiter`, `lookupLimiter` | Fixed-window rate limits (see below). |
| `imageUpload()`, `profilePictureUpload()`, `coverPictureUpload()`, `pdfUpload()`, `attachmentUpload()` | Read a multipart body into `ctx.body` and one in-memory `ctx.file`, with the size caps, declared-type filter and error messages the multer setup had. |
| `acceptStoredUpload(purpose)` | Accepts `uploadPath`, an object the browser already put in Storage through `POST /api/uploads`, after re-checking owner folder, size, magic bytes and declared type. |
| `validate*` (confessions) | Parameter and body validation for the confession endpoints. |

## Rate limiting

`src/server/http/rateLimit.ts` implements the same fixed-window limits as before, with the draft-6 `RateLimit-*` headers:

- general API limit per client address (all `/api` routes except `/api/health`);
- `authLimiter` for credential endpoints (fails closed if the shared store is down);
- `createLimiter` for writes;
- `lookupLimiter` per signed-in member for the student-ID existence check (fails closed).

Counters live in Redis when `REDIS_URL` is set (a Lua script keeps increment and expiry atomic) and in process memory otherwise, which on serverless means per instance. IPv6 clients share a bucket per /56.

The client address comes from `X-Forwarded-For` only when `TRUST_PROXY` (hops) is set; on Vercel it defaults to 1. Without a trusted proxy the header is ignored and all clients share the `unknown` bucket, so deployments behind your own reverse proxy should set `TRUST_PROXY=1`.

## CORS and headers

The app and its API share an origin, so a browser request whose `Origin` is this server's own host is always allowed. `CORS_ORIGINS` lists additional exact origins; `*` is rejected. Any other browser origin gets `403 CORS origin is not allowed`, and preflights are answered by `src/proxy.ts`.

`next.config.ts` sends the security headers (`nosniff`, `X-Frame-Options`, HSTS, `Permissions-Policy`, COOP, ...). API responses additionally carry `Content-Security-Policy: default-src 'none'` and `Cache-Control: no-store`. Pages get their CSP from `src/proxy.ts`, with a per-request nonce, in production builds.

## Endpoints

All paths are under `/api`. "Members" means `authenticateToken`: an active IUTverse member.

| Area | Endpoints | Access |
|---|---|---|
| Health | `GET /health` | Open, not rate limited |
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/password/reset-request` | Open, auth-limited |
| | `PUT /auth/password`, `GET /auth/validate`, `GET /auth/me` | Members |
| | `GET /auth/users` | Admin |
| Profile | `GET/POST/PUT /profile`, `GET/PATCH /profile/me`, `GET /profile/:userId`, `GET /profile-reference-data`, picture and cover upload/read/delete | Members |
| Users | `PUT /user`, `GET /users/search`, `GET/PUT/DELETE /user/student-id`, `GET /user/student-id/check/:studentId` (lookup-limited), `GET /user/:userId`, `GET /dashboard` | Members |
| | `GET /user/by-student-id/:studentId` | Admin |
| Posts | `GET/POST /posts`, `GET/PUT/DELETE /posts/:id`, `POST /posts/:id/react`, `GET /feed`, comments under `/posts/:id/comments` and `/comments/:commentId` | Members; writes are create-limited |
| Jobs | `GET/POST /jobs`, `GET/PUT/DELETE /jobs/:id`, comments, replies, `POST/DELETE /jobs/:id/apply`, application status, count and list | Members; the application list is for the poster or a moderator |
| Lost and found | `GET /lost-and-found`, `GET /lost-and-found/:postId` | Open; signed-in callers also see poster details |
| | create, update, delete, `PATCH .../resolve`, `PATCH .../activate` | Members, owner only |
| Confessions | `GET /confessions`, `/confessions/random`, `/confessions/analytics`, `/confessions/:id` | Open (anonymous content, no stored author) |
| | create, reactions, poll votes, `user-reactions`, `polls/:pollId/user-voted` | Members |
| Cat corner | `/cat-posts` (list, detail, create, delete, like, comment), `/cat-qa/questions` and `/cat-qa/answers` | Members |
| Academic | `GET /academic/departments` | Open |
| | `POST /academic/departments` | Admin |
| | `/academic/resources` (list, detail, create, update, delete), `POST .../:id/helpful`, `GET .../:id/file` (signed redirect) | Members |
| Chat | `/chat/conversations`, `/chat/messages`, `/chat/conversations/:id/messages`, `PUT .../read`, `GET /chat/attachments/:messageId` (signed redirect) | Members; participants only |
| Community | `/saved-items/:kind/:id`, `/reports`, `/events`, `/events/:id`, `PUT /events/:id/rsvp`, `POST /issue-reports` | Members |
| | `GET /reports`, `PATCH /reports/:id` | Moderators and admins |
| | `GET /campus/weather` | Open (cached proxy) |
| Security | `PATCH /admin/users/:userId/role`, `POST /moderation/posts/:postId/identity-disclosures` | Admin, and moderators for disclosures |
| Uploads | `POST /uploads` | Members |

`tests/server/api-surface.test.ts` pins this list against the endpoints the Express routers exposed, and checks that every endpoint not listed as open answers `401` to an anonymous caller.

## Controllers and services

Controllers (`src/server/controllers`) do the HTTP-specific work: read params, query and body, validate with the shared helpers, call services, choose status codes, and shape the response. Services (`src/server/services`) hold domain logic, Supabase calls, ownership checks, payload whitelisting and Storage integration. Post and comment logic still lives in their controllers, as before.

Public profile responses are minimized (`mapProfile`): no email, role or student ID.

## Uploads

Small files can be sent as multipart. Larger ones go straight to Supabase Storage with a signed upload URL (`POST /api/uploads`, see `docs/vercel-deployment.md`), and the route that uses them receives `uploadPath`. Either way `storageService.uploadObject` and `uploadIntentService.claimUpload` verify magic bytes and derive the stored extension and content type from the content, never from the client's header.

## Tests

Server tests run with Vitest (`npm run test:server`). They call the real `proxy` and Route Handlers through `tests/helpers/dispatch.ts`, with Supabase and `securityService` stubbed by `tests/helpers/stubs.ts`, so nothing reaches a real project.

- `authorization-behavior`: role matrix for the privileged endpoints.
- `uploads-behavior`: upload intents, claims, and multipart limits.
- `api-surface`: endpoint inventory and anonymous access.
- `route-pipeline`, `rate-limit`, `cors-and-headers`, `client-ip`: the rebuilt middleware.
- `backend-audit`: regression checks for the original audit findings (`BUG-001` to `BUG-062`, `NEW-001` to `NEW-005`).
- `critical-security-remediation`, `frontend-contracts`: migrations and client/server agreement.

Verification commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run security:scan-env
npm audit --omit=dev
```

## Rules for future backend work

- Use Supabase Auth, Supabase tables and Supabase Storage as the foundation.
- Put HTTP concerns in controllers and data concerns in services; keep route files to their middleware chain.
- Use `authenticateToken` plus role and ownership checks for protected data.
- Use the shared validation and response helpers.
- Keep public profile responses minimal unless a route is explicitly current-user or admin only.
- Never trust client MIME headers alone for uploads.
- Keep `import "server-only"` at the top of server modules so they cannot reach a browser bundle.
- Add or update a regression test for every security or data-shape change.
