-- Make Storage bucket settings match what the app expects, whatever state the
-- buckets were in before.
--
-- The first migrations created buckets with `on conflict do nothing`, so a
-- bucket that already existed (made earlier or from the dashboard) kept its old
-- settings. A media bucket left private makes every stored image return
-- "Bucket not found" at its public URL, so uploads work but images never show.
--
-- Public media buckets: the API returns /storage/v1/object/public/... URLs for
-- these. Object paths are <user id>/<prefix>-<time>-<random>. Reading and
-- writing through the API and Storage policies is unchanged: clients still
-- cannot write objects directly.
-- Private buckets: served only through short-lived signed URLs after the API
-- checks access (resource files, chat attachments).
--
-- Limits mirror the API's upload rules (images 5 MB, PDFs and attachments
-- 10 MB). Missing buckets are created.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('covers', 'covers', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post-media', 'post-media', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('lost-found', 'lost-found', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('cat-posts', 'cat-posts', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('event-images', 'event-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('academic-resources', 'academic-resources', false, 10 * 1024 * 1024, array['application/pdf']),
  ('chat-attachments', 'chat-attachments', false, 10 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
