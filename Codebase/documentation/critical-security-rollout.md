# Critical Security Rollout

The repository changes are additive, but the migration intentionally resets every
application role to `user`. Do not run it against production without completing
the preflight and bootstrap steps below.

## Preflight

1. Take a verified Supabase database backup.
2. Export the existing `auth.users`, `profiles.role`, and email-domain distribution
   for review. Existing role values are evidence only and must not be reused.
3. Set `BOOTSTRAP_ADMIN_EMAILS` to a comma-separated allowlist of confirmed accounts.
   Set `BOOTSTRAP_MODERATOR_EMAILS` the same way when moderators are required.
4. Confirm at least one allowlisted administrator can receive email and sign in.

## Deploy

1. Run `npm run migrate:supabase` from `Codebase/server`.
2. Run `npm run security:bootstrap-roles` immediately after migration.
3. Verify the bootstrap reports at least one administrator.
4. Deploy the backend, then both clients.
5. In the hosted Supabase project, enable the `before-user-created` Postgres hook
   `public.hook_restrict_iut_signup`. The checked-in `supabase/config.toml` configures
   local Supabase; hosted hook configuration must also be verified during deployment.

## Required smoke tests

- Direct Supabase signup accepts an exact `@iut-dhaka.edu` email and rejects other domains.
- A normal account cannot select `profiles`, `profile_private`, `memberships`, `user_roles`,
  `posts`, or `post_comments` through the Data API.
- `GET /api/auth/me` returns the bootstrapped role and active membership.
- Anonymous post list/detail responses contain no author identifiers.
- Anonymous identity disclosure fails without a matching pending report and creates an
  audit event when used by a moderator.
- Existing grandfathered non-IUT accounts can still sign in and receive an active membership.

## Rollback

Roll back application code only while compatibility columns remain. Never restore the old
profile/post RLS policies. The later contract migration that drops `profiles.role` and moved
private columns should be scheduled only after one stable production release.
# Creating the initial administrator and moderator

Do not insert users directly into `auth.users` with SQL. Supabase Auth owns that schema, including identities and password bookkeeping. Use the service-role provisioning command instead.

1. Apply the critical security migration first.
2. Copy `server/scripts/privileged-accounts.example.json` to `server/scripts/privileged-accounts.local.json`.
3. Replace every placeholder. Use real `@iut-dhaka.edu` inboxes and unique passwords of at least 12 characters. `departmentId`, `batch`, and `studentId` may be `null` for service accounts; if supplied, they must match real data and student IDs must be unique.
4. From `Codebase/server`, run `npm run security:provision-accounts`.
5. Sign in to both accounts, enable MFA in Supabase if the project supports it, and delete `privileged-accounts.local.json`.

The command creates or updates the Supabase Auth user, public profile, private profile, active membership, authoritative role, and immutable audit event. It requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server `.env`. Never place the service-role key or provisioning JSON in a client directory.
