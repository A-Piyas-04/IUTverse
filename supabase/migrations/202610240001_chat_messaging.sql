-- Messaging: delivery and read receipts, edits, emoji reactions, photos,
-- videos, voice messages, GIFs and posts shared into a chat.
--
-- Every write goes through the API (service role); clients keep only their
-- existing SELECT access, which Realtime uses to deliver changes to the
-- participants of a conversation.

-- -----------------------------------------------------------------------------
-- 1. Message columns
-- -----------------------------------------------------------------------------
alter table public.chat_messages
  -- What the message is. Kept explicitly so a shared post still reads as one
  -- after the post is deleted and shared_post_id is cleared.
  add column if not exists kind text not null default 'text',
  -- Set when the recipient's app has received the message; read_at when they opened it.
  add column if not exists delivered_at timestamptz,
  -- Set when the sender edits the text (allowed for 10 minutes after sending).
  add column if not exists edited_at timestamptz,
  -- Bumped whenever a reaction changes, so Realtime tells the chat to refresh.
  add column if not exists reactions_changed_at timestamptz,
  -- Layout hints the browser measured before upload: no jumping while media loads.
  add column if not exists attachment_width integer,
  add column if not exists attachment_height integer,
  add column if not exists attachment_duration_ms integer,
  -- Voice messages: loudness bars (0-100) drawn by the player.
  add column if not exists attachment_waveform smallint[],
  -- GIFs from KLIPY, shown from its CDN.
  add column if not exists gif_url text,
  add column if not exists gif_width integer,
  add column if not exists gif_height integer,
  -- A post shared into the chat. The card says "no longer available" once the post goes.
  add column if not exists shared_post_id bigint references public.posts(id) on delete set null;

alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check
  check (kind in ('text', 'image', 'video', 'audio', 'file', 'gif', 'post'));

-- Attachments sent before this migration were images or PDFs.
update public.chat_messages
set kind = case when attachment_mime_type like 'image/%' then 'image' else 'file' end
where attachment_path is not null and kind = 'text';

alter table public.chat_messages drop constraint if exists chat_messages_media_hints_check;
alter table public.chat_messages add constraint chat_messages_media_hints_check check (
  (attachment_width is null or attachment_width between 1 and 20000)
  and (attachment_height is null or attachment_height between 1 and 20000)
  and (attachment_duration_ms is null or attachment_duration_ms between 0 and 3600000)
  and (attachment_waveform is null or cardinality(attachment_waveform) <= 64)
  and (gif_width is null or gif_width between 1 and 4000)
  and (gif_height is null or gif_height between 1 and 4000)
);

-- Recipients' apps mark everything they have not acknowledged yet.
create index if not exists chat_messages_undelivered_idx
  on public.chat_messages (conversation_id)
  where delivered_at is null;
create index if not exists chat_messages_shared_post_idx
  on public.chat_messages (shared_post_id)
  where shared_post_id is not null;

-- -----------------------------------------------------------------------------
-- 2. Reactions: one emoji per member per message
-- -----------------------------------------------------------------------------
create table if not exists public.chat_message_reactions (
  id bigserial primary key,
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists chat_message_reactions_conversation_idx
  on public.chat_message_reactions (conversation_id);

alter table public.chat_message_reactions enable row level security;

drop policy if exists "chat reactions readable by participant" on public.chat_message_reactions;
create policy "chat reactions readable by participant"
  on public.chat_message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = chat_message_reactions.conversation_id
        and cp.user_id = (select auth.uid())
    )
    or public.is_admin_or_mod()
  );

revoke all on public.chat_message_reactions from anon;
revoke insert, update, delete, truncate on public.chat_message_reactions from authenticated;
grant select on public.chat_message_reactions to authenticated;

-- A reaction changing touches its message. Realtime filters by conversation on
-- chat_messages, and cannot filter deletes on the reactions table itself.
create or replace function public.touch_message_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_messages
  set reactions_changed_at = now()
  where id = coalesce(new.message_id, old.message_id);
  return null;
end;
$$;

revoke execute on function public.touch_message_on_reaction() from anon, authenticated, public;

drop trigger if exists chat_message_reactions_touch on public.chat_message_reactions;
create trigger chat_message_reactions_touch
  after insert or update or delete on public.chat_message_reactions
  for each row execute procedure public.touch_message_on_reaction();

-- -----------------------------------------------------------------------------
-- 3. Storage: photos, videos and voice messages in chat
-- -----------------------------------------------------------------------------
-- 50 MB is the largest video; the API caps every other type lower.
update storage.buckets
set file_size_limit = 50 * 1024 * 1024,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/webm', 'audio/ogg', 'audio/mp4'
    ]
where id = 'chat-attachments';
