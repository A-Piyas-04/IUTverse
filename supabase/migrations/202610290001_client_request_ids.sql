-- Idempotency for retry-prone creates (docs/api/idempotency.md).
--
-- A mobile client that times out cannot know whether the server saw its request, so it retries. To make that safe
-- the client sends an `Idempotency-Key` header and the API stores it with the created row as `client_request_id`.
-- A unique index on (author, client_request_id) makes a duplicate impossible, even when two retries race.
--
-- * Nullable: existing rows and every request without a key are unaffected. Postgres treats NULLs as distinct in a
--   unique index, so any number of rows without a key may exist.
-- * Plain (non-partial) unique indexes, because PostgREST can only target a full index in on_conflict.
-- * The key is a client-chosen label, scoped to its author. It is not a secret and grants nothing.
-- * Additive and backward compatible: web clients that never send a key behave exactly as before.

alter table public.chat_messages add column if not exists client_request_id text;
alter table public.posts add column if not exists client_request_id text;
alter table public.post_comments add column if not exists client_request_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_client_request_id_format') then
    alter table public.chat_messages add constraint chat_messages_client_request_id_format
      check (client_request_id is null or client_request_id ~ '^[A-Za-z0-9_-]{16,64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'posts_client_request_id_format') then
    alter table public.posts add constraint posts_client_request_id_format
      check (client_request_id is null or client_request_id ~ '^[A-Za-z0-9_-]{16,64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'post_comments_client_request_id_format') then
    alter table public.post_comments add constraint post_comments_client_request_id_format
      check (client_request_id is null or client_request_id ~ '^[A-Za-z0-9_-]{16,64}$');
  end if;
end $$;

create unique index if not exists chat_messages_sender_client_request_uidx on public.chat_messages (sender_id, client_request_id);
create unique index if not exists posts_author_client_request_uidx on public.posts (author_id, client_request_id);
create unique index if not exists post_comments_author_client_request_uidx on public.post_comments (author_id, client_request_id);

notify pgrst, 'reload schema';
