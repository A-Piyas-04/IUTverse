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
