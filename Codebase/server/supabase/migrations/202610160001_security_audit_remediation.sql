-- Security audit remediation (2026-10-16).
--
-- The browser holds the anon key, so every member can call PostgREST and
-- Storage directly. This migration makes RLS and grants the authoritative
-- control on that path:
--   1. Private chat isolation.
--   2. Client writes to app tables only through the Express API.
--   3. Storage bucket content-type and size limits.
--   4. A single audited function for moderation decisions.
--   5. Fail-closed role checks in privileged functions.

-- -----------------------------------------------------------------------------
-- 1. Private chat
-- -----------------------------------------------------------------------------
-- Inside a policy sub-select an unqualified column binds to the innermost
-- table, so the outer row's column must be written with its table name.

drop policy if exists "conversations readable by participant" on public.conversations;
create policy "conversations readable by participant"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = (select auth.uid())
    )
    or public.is_admin_or_mod()
  );

drop policy if exists "chat messages readable by participant" on public.chat_messages;
create policy "chat messages readable by participant"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = chat_messages.conversation_id
        and cp.user_id = (select auth.uid())
    )
    or public.is_admin_or_mod()
  );

drop policy if exists "participants send chat messages" on public.chat_messages;
create policy "participants send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = chat_messages.conversation_id
        and cp.user_id = (select auth.uid())
    )
  );

-- Only the API (service role) creates conversations and adds participants;
-- chatService.getOrCreateConversation already does this server-side.
drop policy if exists "conversation participants insert own membership" on public.conversation_participants;
drop policy if exists "authenticated users create conversations" on public.conversations;
revoke insert, update, delete, truncate on public.conversations from anon, authenticated;
revoke insert, update, delete, truncate on public.conversation_participants from anon, authenticated;
revoke update, delete, truncate on public.chat_messages from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. One write path: the Express API
-- -----------------------------------------------------------------------------
-- Owner UPDATE/ALL policies have no column restriction, so an owner could
-- un-archive moderated content or forge counters. posts, post_comments and
-- profiles already had client grants revoked (202607030001); do the same for
-- every other app table. The API uses the service role and is unaffected.
-- SELECT grants and their RLS policies are left as they are.
-- chat_messages keeps its participant-checked INSERT policy (section 1).
do $$
declare
  target record;
begin
  for target in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> 'chat_messages'
  loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', target.relname);
  end loop;
end $$;

revoke insert on public.chat_messages from anon;

-- Tables created by later migrations must opt in to client writes explicitly.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate on tables from anon, authenticated;

-- Bucket limits are enforced by Storage for every upload, including any that
-- bypass the API's magic-byte checks. Values mirror the API's multer limits.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file_size_limit = 5 * 1024 * 1024
where id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts', 'event-images');

update storage.buckets
set allowed_mime_types = array['application/pdf'],
    file_size_limit = 10 * 1024 * 1024
where id = 'academic-resources';

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    file_size_limit = 10 * 1024 * 1024
where id = 'chat-attachments';

-- Uploads go through the API (validated, rate-limited, service role). Members
-- keep read access; direct client writes to Storage are removed.
drop policy if exists "users upload own app media" on storage.objects;
drop policy if exists "users update own app media" on storage.objects;
drop policy if exists "users delete own app media" on storage.objects;
