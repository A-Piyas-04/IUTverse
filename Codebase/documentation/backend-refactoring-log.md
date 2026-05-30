# Backend Refactoring Log

This is the living refactoring record for IUTverse.

Before starting any future refactor, quickly read this file to understand what has already changed and what assumptions are now true. After finishing any future refactor, update this file with the date, scope, files or subsystems touched, verification run, and any known follow-up work.

## Current Refactor Baseline

As of 2026-05-29, the active backend has been migrated away from the old custom JWT/local Prisma/Postgres path and onto a Supabase-first architecture.

Active backend routes should now treat Supabase as the source of truth for:

- Auth and session validation.
- User/profile data.
- Feature data tables.
- Storage-backed uploads.
- Realtime-ready chat tables.

The old Prisma schema and migration folder may still exist as historical/reference artifacts, but active `Codebase/server/src` route logic should not instantiate Prisma or depend on local `/uploads` or `/files` static paths.

## Refactor Work Completed

### Supabase Foundation

- Added Supabase SDK dependencies to both client and server.
- Added server Supabase config in `Codebase/server/src/config/supabase.js`.
- Added client Supabase config in `Codebase/client/src/services/supabaseClient.js`.
- Added Supabase environment variables to `Codebase/server/env.example`.
- Added `DIRECT_URL` support to Prisma config only for migration compatibility.
- Added SQL migrations under `Codebase/server/supabase/migrations`.
- Added `Codebase/server/supabase/README.md` with migration notes.
- Added `npm run migrate:supabase` through `Codebase/server/scripts/applySupabaseMigrations.js`.

### Database Schema Migration

- Created Supabase-native schema using UUID user IDs from `auth.users`.
- Added `public.profiles` as the app profile table linked to Supabase Auth.
- Added temporary `legacy_user_id` mapping support for old integer IDs.
- Normalized departments and profile academic identity.
- Replaced loose status/type strings with database enums/check-oriented schema design.
- Reworked post categorization into `post_categories` and `post_category_links`.
- Added database-maintained counters/triggers for reactions, comments, and poll votes.
- Added direct/group conversation support with `direct_key`.
- Moved file metadata to bucket/object-path columns.
- Added ownership fields such as `uploaded_by_id`.
- Added RLS policies for profiles, posts, comments, jobs, lost-and-found, cat features, confessions, academic resources, events, chat, and storage.
- Added Supabase Storage buckets:
  - `avatars`
  - `covers`
  - `post-media`
  - `lost-found`
  - `cat-posts`
  - `academic-resources`

### Auth Refactor

- Replaced generated-password signup with Supabase email/password signup.
- Removed plaintext password logging and `devPassword` responses.
- Removed weak custom password generation from active auth flow.
- Updated server auth middleware to verify Supabase access tokens.
- Preserved compatibility by setting both `req.user.id` and `req.user.userId` to the Supabase UUID.
- Protected `/api/auth/users`; it is no longer public.
- Fixed dotenv import-order issue by loading env inside Supabase config.

### Frontend Auth Refactor

- Updated the auth context to initialize from Supabase sessions.
- Updated API requests to attach Supabase access tokens.
- Updated login to use Supabase sign-in when client Supabase env vars are present.
- Updated signup to collect password and create a Supabase account.
- Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` expectations.

### Storage Refactor

- Added `Codebase/server/src/services/storageService.js`.
- Converted profile-picture and cover-picture uploads to Supabase Storage.
- Converted post image uploads to Supabase Storage.
- Converted cat post image uploads to Supabase Storage.
- Converted lost-and-found image uploads to Supabase Storage.
- Converted academic PDF uploads to Supabase Storage.
- Removed active local static serving for `/uploads` and `/files`.
- Switched upload middlewares to memory storage where applicable.

### Backend API Refactor

- Rewrote active user/profile service logic to use Supabase `profiles`.
- Rewrote posts and comments controllers to use Supabase tables.
- Rewrote jobs, job comments, and job applications services to use Supabase tables.
- Rewrote lost-and-found service/controller to use Supabase tables and require auth for creation.
- Rewrote cat posts service to use Supabase tables and require auth for creation.
- Rewrote cat Q&A service/routes to use Supabase tables and require auth for create/answer/delete operations.
- Rewrote chat service to use Supabase conversations, participants, and messages.
- Rewrote confession service to use Supabase confessions, reactions, polls, options, and votes.
- Rewrote academic resource service/controller to use Supabase tables and Storage.
- Added `Codebase/server/src/utils/supabaseData.js` for shared Supabase data helpers.
- Removed duplicate lost-and-found route mount.
- Deleted old duplicate root backend files:
  - `Codebase/server/controllers/postController.js`
  - `Codebase/server/controllers/commentController.js`
  - `Codebase/server/routes/postRoutes.js`
  - `Codebase/server/middleware/authMiddleware.js`
- Disabled `Codebase/server/src/deleteAllPosts.js`.
- Removed active Prisma runtime dependency and old Prisma seed scripts from server package scripts.

### Security Hardening Included

- Removed custom JWT dependency from the active auth path.
- Removed weak generated-password signup path.
- Removed password hash usage from active backend services.
- Added request body size limits in Express.
- Stopped serving local upload directories as static public paths.
- Re-enabled auth on previously unauthenticated lost-and-found and cat routes.
- Added ownership checks for jobs, comments, cat content, lost-and-found, academic resources, and profile mutations.
- Avoided exposing email from mapped profile responses where possible.

## Verification Already Run

The following checks passed during the refactor:

- Backend syntax check across `Codebase/server/src/**/*.js`.
- Server app import/load check.
- Client production build with `npm.cmd run build`.
- Read-only Supabase smoke checks for:
  - jobs
  - posts
  - departments
  - cat questions
  - confessions
- Search check confirmed no active `Codebase/server/src` or server package references to:
  - `PrismaClient`
  - `@prisma/client`
  - `prisma.`
  - `passwordHash`
  - `/uploads`
  - `/files`

## Known Follow-Up Work

- Old `Codebase/server/prisma` files remain as historical/reference artifacts.
- Old tests and seed files may still reference Prisma/local uploads and need a separate test-suite migration.
- Some frontend feature components may still assume old response shapes; verify each workflow manually after backend startup.
- Supabase RLS policies should be tested with anon/authenticated clients, not only the service-role backend.
- `npm audit` still reports existing dependency vulnerabilities.
- Vite build still warns about large chunks and a dynamic/static import overlap involving `api.js`.

## Future Refactor Protocol

For every future refactor:

1. Read this file before making changes.
2. Add a new dated entry under `Future Entries`.
3. Record the goal, files/subsystems touched, behavior changes, verification commands, and any residual risks.
4. Keep route URLs stable unless the user explicitly approves breaking API changes.
5. Prefer Supabase Auth, Supabase tables, Supabase Storage, and existing helpers over reintroducing local database clients or local upload paths.

## Future Entries

Add new entries below this line.

### 2026-05-30 - Near-Finished Backend Refactor Cleanup

Goal: finish the small cleanup work left from the solved or mostly solved Supabase backend refactor items, without revisiting fully solved migration/security work.

Changed:

- Removed the remaining active `authMiddleware` compatibility import from post routes and deleted the wrapper file after confirming no active references remained.
- Deleted the disabled `src/deleteAllPosts.js` destructive utility from production source.
- Finished Cat Q&A pagination by wiring `page` and `limit` through the controller/service, defaulting to 20 items, capping at 100, and returning pagination metadata.
- Added optional Cat Q&A client pagination parameters while preserving the existing `questions` response shape.
- Implemented real confession `sortBy=mostVoted` behavior using poll `total_votes`, and replaced the analytics placeholder with a real `mostVotedPoll` query.
- Tightened post reaction handling by normalizing old uppercase frontend reaction values, validating allowed reaction types, and returning the trigger-maintained `reactionCount`.
- Restored personalized feed filtering safely by applying department and batch filters only when the current profile has non-null values; otherwise the feed falls back to recent posts.
- Kept public profile email mapping privacy-safe. Public mapped profile responses still expose no real email address; current-user auth responses may still include the user's own email for session UI compatibility.

Verification:

- `node --check` passed for the touched backend files.
- Full `node --check` pass across `Codebase/server/src/**/*.js` passed.
- Server app import check passed.
- Search confirmed no active `Codebase/server/src` or server package references to `authMiddleware`, `deleteAllPosts`, `PrismaClient`, `@prisma/client`, `prisma.`, `passwordHash`, `/uploads`, or `/files`.
- Read-only Supabase smoke checks passed for jobs, posts, departments, Cat Q&A pagination, confession lists, `sortBy=mostVoted`, and confession analytics.

Known follow-up:

- Reaction toggle behavior was validated at import/service level only; end-to-end add/remove/switch tests still need authenticated seeded data.
- Personalized feed filtering should be manually checked with real profiles that have department and batch values.
- Public route response shapes were kept compatible; frontend components can be simplified later to stop expecting nullable public `email` fields.

### 2026-05-30 - Partially Solved Backend Refactor Cleanup

Goal: finish the previously partially solved backend issues around password recovery, validation, upload errors, stored-content sanitization, realtime chat, and response consistency while keeping existing route URLs stable.

Changed:

- Added Supabase-backed password reset/change compatibility endpoints:
  - `POST /api/auth/password/reset-request`
  - `PUT /api/auth/password`
- Added client API helpers plus minimal login/profile UI for password reset and password change.
- Added shared response helpers, validation helpers, and plain-text sanitization utilities.
- Added a global Express error handler and converted touched auth/upload/validation paths toward the standard response envelope.
- Added standardized multer upload error handling for post images, cat post images, lost-and-found images, profile pictures, cover pictures, and academic PDFs.
- Added validation and sanitization to touched post, comment, chat, job, profile, lost-and-found, cat post, Cat Q&A, academic resource, confession, and user/profile service paths.
- Fixed UUID-era profile lookups that still parsed Supabase UUID user IDs as integers.
- Reordered user routes so specific `/user/student-id` routes are not shadowed by `/user/:userId`.
- Added Supabase Realtime subscriptions in the chat hook for active conversation messages and conversation updates.

Verification:

- Full `node --check` pass across `Codebase/server/src/**/*.js` passed.
- Server app import check passed.
- Client build passed with `npx.cmd vite build --outDir .codex-build-check --emptyOutDir true`; the normal `npm.cmd run build` reached transform successfully but could not write to the existing locked `dist` directory on Windows.
- Temporary build output `.codex-build-check` was removed after verification.
- Read-only Supabase smoke checks passed for jobs, posts, departments, Cat Q&A, and confessions.

Known follow-up:

- End-to-end password reset email delivery depends on Supabase Auth email settings and redirect URL configuration.
- Realtime chat should be manually checked with two authenticated browser sessions.
- Validation is now in shared helpers and touched flows; older untouched edge controllers can continue migrating to the helpers during future edits.
- Client code still has some legacy `/uploads` and `/files` URL fallback references outside the active backend migration scope; review them when the frontend media layer is cleaned up.

### 2026-05-30 - Open Issues #1-#32 Security Pass

Goal: address the remaining open items from original issues `#1-#32` without revisiting already solved Supabase/auth/upload/global-error work.

Changed:

- Added `helmet` security headers and disabled `x-powered-by`.
- Replaced unrestricted CORS with an allowlist guard using `CORS_ORIGINS` and `CORS_ALLOW_CREDENTIALS`.
- Added `express-rate-limit` and wired general API, auth-sensitive, and write-route limiters.
- Added configurable rate-limit env defaults to `env.example`.
- Added `DELETE /api/jobs/:id` as an owner/admin soft delete that sets job status to `deleted`.
- Removed placeholder email credential fallbacks from `config/email.js` and `emailService.js`.
- Updated the old email helper so it no longer sends plaintext passwords.
- Added `npm run security:scan-env` through `scripts/scanSecrets.js`.
- Added `security-credential-rotation.md` with provider rotation and git history cleanup guidance.

Verification:

- `npm.cmd install helmet express-rate-limit` completed and updated server package files.
- `npm run security:scan-env` passed.
- `node scripts/scanSecrets.js --self-test` passed.
- Full `node --check` pass across `Codebase/server/src/**/*.js` passed.
- Server app import check passed.
- Local HTTP smoke check confirmed allowed CORS origin, blocked CORS origin, and Helmet `x-content-type-options: nosniff`.
- Forced low-threshold rate-limit smoke check returned `429` on the second `/api` request.
- Client build passed with `npx.cmd vite build --outDir .codex-build-check --emptyOutDir true`; temporary output was removed.
- Read-only Supabase smoke checks passed for jobs, posts, departments, Cat Q&A, and confessions.

Known follow-up:

- Real credential rotation must still be completed in Supabase, Gmail/Google, deployment providers, and any local collaborator environments.
- Git history rewriting was documented but intentionally not performed automatically.
- Production deployments must set `CORS_ORIGINS` to real frontend origins before launch.

### 2026-05-30 - Open Issues #33-#55 Cleanup

Goal: finish the remaining active items from original issues `#33-#55`: graceful shutdown, debug logging cleanup, package metadata/dev script fixes, local test infrastructure, unused dependency cleanup, and bounded job pagination.

Changed:

- Added a shared level-aware backend logger with `LOG_LEVEL` support and moved active backend logging through it.
- Updated request logging to emit method, path, status, and duration only; request bodies and user-generated content are no longer logged by active backend controllers.
- Added graceful `SIGINT`/`SIGTERM` handling in `server.js`, including HTTP server close and a 10-second forced-exit timeout.
- Changed server package metadata from `main: index.js` to `main: server.js`.
- Added `nodemon` as a dev dependency and changed `npm run dev` to use it; added `npm run dev:node` for plain Node.
- Replaced the placeholder test script with a local Node test suite under `test/unit`.
- Added unit coverage for validation/sanitization helpers, response envelopes, and the secret scanner self-test.
- Removed unused `pg-promise`; kept `pg` because the Supabase migration runner still uses it.
- Changed job listing to bounded pagination with `page=1`, `limit=20`, max `limit=100`.
- Updated the jobs client helper to unwrap the new paginated backend envelope while preserving existing component usage.
- Fixed an out-of-range Supabase pagination edge case so empty job pages return `200` with an empty array instead of `PGRST103`.

Verification:

- `npm.cmd install --save-dev nodemon` completed.
- `npm.cmd uninstall pg-promise` completed.
- `npm.cmd test` passed with 8 local unit tests.
- `npm.cmd run security:scan-env` passed.
- `node scripts/scanSecrets.js --self-test` passed.
- Full `node --check` pass across `Codebase/server/src/**/*.js` and `server.js` passed.
- Search confirmed active backend code no longer calls `console.log`, `console.warn`, or `console.error` outside the shared logger utility.
- Search confirmed `pg-promise` is no longer present in server package files.
- Server app import check passed.
- Graceful shutdown smoke check passed by emitting `SIGTERM` and observing clean HTTP server close.
- Read-only Supabase smoke checks passed for jobs, posts, departments, Cat Q&A, and confessions.
- Local API smoke checks for `GET /api/jobs` and `GET /api/jobs?page=2&limit=5` returned `200`, pagination metadata, and no more than the requested limit.

Known follow-up:

- Existing old ad-hoc files under `Codebase/server/test` remain as manual/reference scripts; they are intentionally excluded from the default test command because some still reference removed Prisma or optional axios-era tooling.
- `npm audit` still reports existing dependency vulnerabilities unrelated to this pass.
- Frontend debug logging remains outside this backend-focused cleanup and can be handled in a separate frontend cleanup pass.

### 2026-05-30 - Post Upload 400 Fix

Goal: fix homepage post creation returning `400 Bad Request` when uploading an image post.

Changed:

- Updated regular post creation validation so the backend accepts either text content or an uploaded image.
- Image-only posts now store an empty string for `posts.content`, preserving the existing non-null database column.
- Updated the frontend post upload/update service to use the current Supabase session token for multipart requests.
- Removed the manually set multipart `Content-Type` from post upload/update calls so the browser can attach the correct boundary.

Verification:

- `node --check Codebase/server/src/controllers/postController.js` passed.
- `npm.cmd test` passed with 8 local backend unit tests.
- Client Vite build passed using temporary `.codex-build-check` output, which was removed after verification.

Known follow-up:

- If a post upload still fails, inspect the backend JSON response body in the browser Network tab; remaining likely causes are file size over 5MB, non-image MIME type, missing auth session, or Supabase Storage/RLS configuration.
