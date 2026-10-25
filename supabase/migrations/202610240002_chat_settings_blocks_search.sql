-- Per-person chat settings (nicknames, mute, mark as unread, delete chat for
-- me), blocking, and indexes for site-wide search.
-- Writes go through the API (service role); clients keep read access only.

-- -----------------------------------------------------------------------------
-- 1. Chat settings, one row per member per conversation
-- -----------------------------------------------------------------------------
alter table public.conversation_participants
  -- What everyone in this chat calls this member (Messenger-style nickname).
  add column if not exists nickname text,
  -- This member's own settings for the chat.
  add column if not exists muted_until timestamptz,
  add column if not exists marked_unread boolean not null default false,
  -- "Delete chat": messages up to this moment are gone for this member only.
  add column if not exists cleared_at timestamptz;

alter table public.conversation_participants drop constraint if exists conversation_participants_nickname_check;
alter table public.conversation_participants add constraint conversation_participants_nickname_check
  check (nickname is null or char_length(btrim(nickname)) between 1 and 40);

-- -----------------------------------------------------------------------------
-- 2. Blocking
-- -----------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Members see whom they blocked, never who blocked them.
drop policy if exists "members read their own blocks" on public.user_blocks;
create policy "members read their own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon;
revoke insert, update, delete, truncate on public.user_blocks from authenticated;
grant select on public.user_blocks to authenticated;

-- Whether anyone else in the conversation and this member have blocked each
-- other (either way). Security definer: it must see blocks the member cannot.
create or replace function public.chat_is_blocked(target_conversation_id bigint, member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants other
    join public.user_blocks ub
      on (ub.blocker_id = other.user_id and ub.blocked_id = member_id)
      or (ub.blocker_id = member_id and ub.blocked_id = other.user_id)
    where other.conversation_id = target_conversation_id
      and other.user_id <> member_id
  );
$$;

revoke execute on function public.chat_is_blocked(bigint, uuid) from anon, public;
grant execute on function public.chat_is_blocked(bigint, uuid) to authenticated;

-- The direct-insert path for text messages must respect blocks too.
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
    and not public.chat_is_blocked(chat_messages.conversation_id, (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- 3. Search: trigram indexes so "contains" searches stay fast as content grows
-- -----------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index if not exists profiles_display_name_trgm_idx on public.profiles using gin (display_name extensions.gin_trgm_ops);
create index if not exists posts_content_trgm_idx on public.posts using gin (content extensions.gin_trgm_ops);
create index if not exists events_title_trgm_idx on public.events using gin (title extensions.gin_trgm_ops);
create index if not exists jobs_title_trgm_idx on public.jobs using gin (title extensions.gin_trgm_ops);
create index if not exists academic_resources_title_trgm_idx on public.academic_resources using gin (title extensions.gin_trgm_ops);
create index if not exists lost_and_found_posts_title_trgm_idx on public.lost_and_found_posts using gin (title extensions.gin_trgm_ops);
create index if not exists chat_messages_content_trgm_idx on public.chat_messages using gin (content extensions.gin_trgm_ops);
