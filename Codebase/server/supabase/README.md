# Supabase Migration Notes

This directory contains the Supabase-native database contract for IUTverse.

## Apply order

1. Create a Supabase project.
2. Configure Auth so only `@iut-dhaka.edu` addresses can sign up.
3. Set `DIRECT_URL` in `server/.env` to that project's direct database connection string.
4. From `Codebase/server`, run `npm run migrate:supabase`. The runner applies every unapplied file in `supabase/migrations` in timestamp order and records it in `public.iutverse_schema_migrations`.
5. Start the API with `npm run dev` only after the migration command reports `Supabase migrations complete.`
6. Set the remaining server env values from `env.example`.
7. Set client env values from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

If API logs report missing columns such as `profiles.handle` or `lost_and_found_posts.availability`, the API and database schema are out of sync. Stop the API, run the migration command above, and restart it. Do not remove those columns from API queries; they are part of the V2 contract.

## Data migration shape

- Import existing users into Supabase Auth first.
- Populate `public.profiles.legacy_user_id` and `public.legacy_user_map`.
- Rewrite all old integer user foreign keys to the new UUID profile IDs.
- Upload files from `server/uploads` into the matching Storage bucket with object paths prefixed by the owner UUID.
- Rewrite old `/uploads/...` and `/files/...` database paths to bucket/object metadata columns.

The Express API now accepts Supabase access tokens, but feature tables still need endpoint-by-endpoint UUID migration before old Prisma controllers can be fully removed.
