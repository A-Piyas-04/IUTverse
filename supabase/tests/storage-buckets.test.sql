-- Bucket visibility and limits. A media bucket left private (for example one
-- that already existed before the migrations ran) makes uploaded images 404 at
-- their public URL; a private bucket made public would expose signed-URL-only
-- files.
begin;

select plan(4);

select is(
  (select array_agg(id::text order by id) from storage.buckets where public),
  array['avatars', 'cat-posts', 'covers', 'event-images', 'lost-found', 'post-media'],
  'exactly the six media buckets are public'
);

select is(
  (select array_agg(id::text order by id) from storage.buckets where not public),
  array['academic-resources', 'chat-attachments'],
  'resource files and chat attachments stay private (signed URLs only)'
);

select is(
  (select count(*)::int from storage.buckets where file_size_limit is null or allowed_mime_types is null),
  0,
  'every bucket has a size limit and a type allowlist'
);

select is(
  (select count(*)::int from storage.buckets
   where public and (allowed_mime_types && array['image/svg+xml', 'text/html', 'application/xhtml+xml'])),
  0,
  'no public bucket accepts SVG or HTML'
);

select * from finish();
rollback;
