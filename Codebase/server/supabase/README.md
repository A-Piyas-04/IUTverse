# Supabase Migration Notes

This directory contains the Supabase-native database contract for IUTverse.

## Apply order

1. Create a Supabase project.
2. Configure Auth so only `@iut-dhaka.edu` addresses can sign up.
3. Apply migrations in `supabase/migrations` in timestamp order.
4. Set server env values from `env.example`.
5. Set client env values from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Data migration shape

- Import existing users into Supabase Auth first.
- Populate `public.profiles.legacy_user_id` and `public.legacy_user_map`.
- Rewrite all old integer user foreign keys to the new UUID profile IDs.
- Upload files from `server/uploads` into the matching Storage bucket with object paths prefixed by the owner UUID.
- Rewrite old `/uploads/...` and `/files/...` database paths to bucket/object metadata columns.

The Express API now accepts Supabase access tokens, but feature tables still need endpoint-by-endpoint UUID migration before old Prisma controllers can be fully removed.
