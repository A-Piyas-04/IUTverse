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

