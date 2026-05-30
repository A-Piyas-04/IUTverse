# IUTverse Backend Structure

This document describes the current backend structure for IUTverse. The active backend is the Supabase-first Express application under `Codebase/server/src`. Older Prisma files and legacy root folders may still exist as historical artifacts, but active request handling should be understood from `src`.

## Runtime Overview

The backend is a Node.js Express API. The entry point is `Codebase/server/server.js`, which imports the Express app from `Codebase/server/src/app.js`, starts the HTTP server, logs startup state, and handles graceful shutdown on `SIGINT` and `SIGTERM`.

The backend uses Supabase for:

- Authentication and token validation.
- Database reads and writes through Supabase tables.
- Storage-backed uploads for avatars, covers, post media, lost-and-found media, cat posts, and academic resource PDFs.
- Realtime-ready chat tables.

The active backend does not instantiate Prisma in `src`, does not serve local `/uploads` or `/files` directories, and does not use local password hashing for the active auth flow.

## Top-Level Server Layout

```text
Codebase/server/
  server.js
  package.json
  env.example
  src/
    app.js
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
  supabase/
    migrations/
    README.md
  scripts/
  test/
    unit/
```

### `server.js`

`server.js` is intentionally small. It imports `src/app.js`, listens on `config.port`, logs the active environment, and closes the HTTP server cleanly during shutdown. Business logic should not be added here.

### `src/app.js`

`src/app.js` creates and configures the Express app. Its responsibilities are:

- Disable `x-powered-by`.
- Apply Helmet security headers.
- Apply the production `5xx` response sanitizer.
- Apply JSON and URL-encoded body parsers with `1mb` limits.
- Enforce CORS origin allowlisting.
- Apply API-wide rate limiting.
- Attach request logging.
- Mount all routes from `src/routes`.
- Convert malformed JSON and oversized bodies into stable error responses.
- Handle uncaught request errors.

Important behavior:

- Oversized JSON returns `413` with `Request body too large`.
- Malformed JSON returns `400` with `Malformed JSON request body`.
- In production, `5xx` responses are stripped to a generic `Internal server error` body even if a controller accidentally includes internal details.

## Configuration Layer

Configuration lives in `src/config`.

### `config.js`

Centralizes environment-driven settings:

- `PORT`
- `NODE_ENV`
- legacy `JWT_SECRET` fallback support for non-Supabase local compatibility
- CORS settings
- rate-limit settings
- Supabase URL and keys
- email credentials
- database URL for migration tooling

The active auth path uses Supabase Auth. `JWT_SECRET` is not given a hardcoded fallback.

### `supabase.js`

Creates Supabase clients when the required environment variables exist:

- `supabase`: anon-key client for auth operations such as signup/login/password reset.
- `supabaseAdmin`: service-role client for trusted backend operations.

It also exports booleans describing whether each client is configured.

### `email.js`

Creates the Nodemailer transport only when email credentials are configured. It intentionally does not fall back to placeholder credentials.

### `database.js`

Exports the Supabase admin client for compatibility with older imports. It is not a Prisma client.

## Route Layer

Routes live in `src/routes`. `src/routes/index.js` is the route aggregator.

Current mount map:

```text
GET /                         -> health/root message
/api/auth                     -> authRoutes
/api                          -> userRoutes
/api                          -> jobRoutes
/api/lost-and-found           -> lostAndFoundRoutes
/api                          -> confessionRoutes
/api/cat-posts                -> catPostRoutes
/api/cat-qa                   -> catQARoutes
/api                          -> postRoutes
/api/chat                     -> chatRoutes
/api/academic                 -> academicResourceRoutes
```

Route modules should remain thin. Their job is to declare URLs, middleware order, upload handlers, and controller functions. Validation, database access, and mapping should live in controllers/services/helpers.

### Auth Routes

File: `src/routes/authRoutes.js`

Prefix: `/api/auth`

Main endpoints:

- `POST /signup`
- `POST /login`
- `POST /password/reset-request`
- `PUT /password`
- `GET /validate`
- `GET /users`

Security details:

- Signup/login/password reset are auth-rate-limited.
- Password change and token validation require authentication.
- User enumeration requires authentication and admin role.

### User/Profile Routes

File: `src/routes/userRoutes.js`

Prefix: `/api`

Main areas:

- Current profile/dashboard compatibility routes.
- Public profile lookup by Supabase UUID.
- Authenticated profile create/update.
- Display-name update.
- User search for chat.
- Student ID update/read/delete/check.
- Profile picture and cover picture upload/read/delete.

Security details:

- Mutations require `authenticateToken`.
- Public profile responses are intentionally minimized and should not expose email, role, student ID, department, or batch through shared public mappers.
- Upload routes use multer memory storage and shared upload error handlers.

### Post Routes

File: `src/routes/postRoutes.js`

Prefix: `/api`

Main endpoints:

- `POST /posts`
- `GET /posts`
- `GET /posts/:id`
- `PUT /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/react`
- `GET /feed`
- Comment endpoints under `/posts/:postId/comments` and `/comments/:commentId`.

Security details:

- Creating, updating, deleting, reacting, personalized feed, and comment mutations require auth.
- Write routes use `createLimiter`.
- Post image uploads use memory storage, upload error handling, signature validation, and Supabase Storage.

### Job Routes

File: `src/routes/jobRoutes.js`

Prefix: `/api`

Main areas:

- Public job listing/detail.
- Public job comments.
- Protected job create/update/delete.
- Protected job comment create/reply/update/delete.
- Protected job apply/remove/status.
- Job application count remains public.
- Job application details require authentication and are restricted by service ownership checks.

Security details:

- Job updates require the poster.
- Job delete supports poster or moderator/admin soft delete.
- Job applicant details are visible only to the job poster or a moderator/admin.

### Lost And Found Routes

File: `src/routes/lostAndFoundRoutes.js`

Prefix: `/api/lost-and-found`

Main endpoints:

- Public list/detail reads.
- Protected create/update/delete.
- Protected resolve/activate status changes.

The active controller validates type, status, text fields, IDs, and image upload errors. The service enforces ownership and stores image metadata in Supabase Storage.

### Confession Routes

File: `src/routes/confessionRoutes.js`

Prefix: `/api`

Main endpoints:

- Public confession list/random/analytics/detail.
- Protected confession creation.
- Protected reactions.
- Protected poll voting and vote status.

Validation middleware enforces allowed tags, reaction types, poll structure, pagination bounds, and ID formats.

### Cat Post Routes

File: `src/routes/catPostRoutes.js`

Prefix: `/api/cat-posts`

Main endpoints:

- Public list/detail reads.
- Protected create/delete/like/comment.

Cat post media is uploaded to Supabase Storage with verified image signatures.

### Cat Q&A Routes

File: `src/routes/catQARoutes.js`

Prefix: `/api/cat-qa`

Main endpoints:

- Public question list/detail.
- Protected question creation.
- Protected answer creation.
- Protected question/answer deletion.

The service enforces ownership on delete and paginates question lists.

### Chat Routes

File: `src/routes/chatRoutes.js`

Prefix: `/api/chat`

All routes require authentication through `router.use(authenticateToken)`.

Main endpoints:

- `POST /conversations`
- `GET /conversations`
- `POST /messages`
- `GET /conversations/:conversationId/messages`
- `PUT /conversations/:conversationId/read`

The service uses `direct_key` to prevent duplicate direct conversations and checks conversation membership before reading, sending, or marking messages as read.

### Academic Resource Routes

File: `src/routes/academicResourceRoutes.js`

Prefix: `/api/academic`

Main areas:

- Public department reads.
- Admin-only department creation.
- Public resource listing/detail.
- Protected academic resource create/update/delete.

Academic resources can reference either an uploaded PDF or an external link. PDF uploads are validated by MIME type and file signature before storage.

## Middleware Layer

Middleware lives in `src/middleware`.

### Authentication

File: `src/middleware/auth.js`

`authenticateToken` supports the active Supabase Auth path and a legacy JWT fallback if Supabase Admin is not configured. In the Supabase path:

- It extracts the bearer token.
- It verifies the token through `supabaseAdmin.auth.getUser`.
- It fetches profile role/display name.
- It sets both `req.user.id` and `req.user.userId` to the Supabase UUID for compatibility.

### Authorization

File: `src/middleware/authorization.js`

Provides:

- `requireRole(...roles)`
- `requireAdmin`
- `canModerate(user)`

These helpers keep role decisions consistent across routes and services.

### Security

File: `src/middleware/security.js`

Provides:

- Helmet middleware.
- CORS origin allowlist guard.
- CORS options for Express CORS.
- API-wide limiter.
- Auth-specific limiter.
- Create/write limiter.

Default development origins include common local Vite and localhost ports. Production should set `CORS_ORIGINS`.

### Logging

File: `src/middleware/logging.js`

Logs method, path, status, and duration through the shared logger. Request bodies and user-generated content should not be logged.

### Upload Middleware

Upload middleware uses multer memory storage:

- `upload.js`: cat post image uploads.
- `uploadMiddleware.js`: regular post image uploads.
- `profilePictureUpload.js`: profile picture uploads.
- `coverPictureUpload.js`: cover image uploads.
- `uploadPdf.js`: academic PDF uploads.
- `uploadErrors.js`: shared multer error response helpers.

Multer filters perform early MIME-family checks. Final trust is established by `storageService.uploadObject`, which validates magic bytes and derives the stored extension/content type from detected file content.

## Controller Layer

Controllers live in `src/controllers`. They are responsible for HTTP-specific work:

- Read params/query/body.
- Call validation helpers.
- Call services.
- Choose status codes.
- Format response envelopes.
- Log safe metadata.

Controllers should not contain direct SQL strings, storage path construction, or broad field mass assignment. That logic belongs in services and helpers.

Active controllers:

- `authController.js`
- `userController.js`
- `profileController.js`
- `postController.js`
- `commentController.js`
- `jobController.js`
- `jobCommentController.js`
- `jobApplicationController.js`
- `lostAndFoundController.js`
- `confessionController.js`
- `catPostController.js`
- `catQAController.js`
- `chatController.js`
- `academicResourceController.js`

## Service Layer

Services live in `src/services`. They contain domain logic, Supabase calls, ownership checks, database payload mapping, and storage integration.

Active services:

- `userService.js`: profiles, public/current-user mapping, student IDs, user search.
- `storageService.js`: Supabase Storage uploads/removals/public URLs.
- `postController.js` and `commentController.js`: post/comment logic currently lives in controllers rather than a separate service.
- `jobService.js`: jobs, job ownership, soft delete.
- `jobCommentService.js`: threaded job comments.
- `jobApplicationService.js`: applications, owner/admin applicant visibility.
- `lostAndFoundService.js`: lost/found posts and ownership.
- `confessionService.js`: confessions, reactions, polls, analytics.
- `chatService.js`: conversations, participants, messages.
- `catPostService.js`: cat posts, likes, comments.
- `catQAService.js`: cat questions and answers.
- `academicResourceService.js`: departments and resources.
- `emailService.js`: optional welcome email helper.

## Utility Layer

Utilities live in `src/utils`.

### `responses.js`

Defines the standard JSON response helpers:

- `success`
- `created`
- `badRequest`
- `unauthorized`
- `forbidden`
- `notFound`
- `conflict`
- `payloadTooLarge`
- `serverError`

`serverError` includes internal error details outside production only.

### `validation.js`

Shared validation and sanitization helpers:

- HTML stripping and whitespace normalization.
- Required and optional plain text fields.
- Plain text arrays.
- Positive integer parsing.
- Supabase UUID validation.
- Enum validation.
- Pagination clamping.

### `supabaseData.js`

Shared Supabase data helpers:

- `ensureSupabaseAdmin`
- `pageRange`
- public `mapProfile`
- ownership helper
- storage upload helper
- public URL helper

The shared `mapProfile` is intentionally public/minimal.

### `fileValidation.js`

Detects file type from content signatures and validates uploads. Supported types:

- JPEG
- PNG
- WebP
- GIF
- PDF

It rejects mismatches between declared MIME type and detected file content.

### `logger.js`

Level-aware logger controlled by `LOG_LEVEL` and `NODE_ENV`. Production defaults to less verbose logging.

## Request Flow

A typical protected write request flows like this:

1. Request enters `src/app.js`.
2. Helmet, body limits, CORS, rate limiting, and request logging run.
3. Route module matches the URL.
4. `authenticateToken` verifies the Supabase access token.
5. Optional role middleware such as `requireAdmin` runs.
6. Optional upload middleware parses multipart data into memory.
7. Optional upload error middleware normalizes multer errors.
8. Controller validates params/body/query.
9. Service performs ownership checks, sanitizes payloads, calls Supabase, and maps data.
10. Controller sends a JSON response.
11. Global error handler catches uncaught parser/public/internal errors.

## Testing Structure

Active unit tests live in `Codebase/server/test/unit`.

Important test files:

- `backend-audit.test.js`: regression checks for the original backend audit issues `BUG-001` through `BUG-062`, plus newer hardening checks.
- `responses.test.js`: response helper behavior.
- `security-scan.test.js`: secret scanner self-test.
- `validation.test.js`: validation and sanitization helpers.

Current required verification commands:

```powershell
cd Codebase/server
npm.cmd test
npm.cmd run security:scan-env
npm.cmd audit --omit=dev
```

Syntax check:

```powershell
$files = Get-ChildItem -Path 'src' -Recurse -Filter '*.js'
foreach ($file in $files) { node --check $file.FullName }
node --check 'server.js'
```

## Refactor Rules For Future Backend Work

- Use Supabase Auth, Supabase tables, and Supabase Storage as the active backend foundation.
- Keep `server.js` small.
- Put HTTP concerns in controllers and business/data concerns in services.
- Use shared validation and response helpers.
- Keep public profile responses minimized unless a route is explicitly current-user/admin-only.
- Use `authenticateToken` plus role/ownership checks for protected data.
- Do not reintroduce PrismaClient into `src`.
- Do not serve local upload folders as static public paths.
- Do not trust client MIME headers alone for uploads.
- Add or update regression tests for every security or data-shape change.
