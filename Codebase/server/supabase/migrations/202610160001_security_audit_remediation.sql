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

-- Clients may only supply the message itself. Attachment columns are written
-- by the API after it validates and stores the file; letting a client set
-- them would make the API sign URLs for arbitrary Storage objects.
revoke insert on public.chat_messages from authenticated;
grant insert (conversation_id, sender_id, content) on public.chat_messages to authenticated;

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

-- -----------------------------------------------------------------------------
-- 4. Moderation decisions
-- -----------------------------------------------------------------------------
-- Report and content changes happen in one transaction with an audit row.
-- A decision is one of three fixed outcomes; callers cannot combine a report
-- status with an unrelated content action.

create or replace function public.report_target_table(kind public.entity_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'post' then 'posts'
    when 'comment' then 'post_comments'
    when 'resource' then 'academic_resources'
    when 'job' then 'jobs'
    when 'lost_found' then 'lost_and_found_posts'
    when 'confession' then 'confessions'
    when 'cat_post' then 'cat_posts'
    when 'event' then 'events'
  end;
$$;

-- Locks a report target and returns (author, status), or no row when the
-- target does not exist. Confessions have no stored author.
create or replace function public.lock_report_target(kind public.entity_kind, target_id bigint)
returns table (author_id uuid, status public.content_status)
language plpgsql
security definer
set search_path = ''
as $$
begin
  case kind
    when 'post' then
      return query select t.author_id, t.status from public.posts t where t.id = target_id for update;
    when 'comment' then
      return query select t.author_id, t.status from public.post_comments t where t.id = target_id for update;
    when 'resource' then
      return query select t.uploaded_by_id, t.status from public.academic_resources t where t.id = target_id for update;
    when 'job' then
      return query select t.posted_by_id, t.status from public.jobs t where t.id = target_id for update;
    when 'lost_found' then
      return query select t.user_id, t.status from public.lost_and_found_posts t where t.id = target_id for update;
    when 'confession' then
      return query select null::uuid, t.status from public.confessions t where t.id = target_id for update;
    when 'cat_post' then
      return query select t.user_id, t.status from public.cat_posts t where t.id = target_id for update;
    when 'event' then
      return query select t.created_by_id, t.status from public.events t where t.id = target_id for update;
  end case;
end;
$$;

-- Raises unless the actor is an active admin or moderator. A missing role row
-- or membership fails closed.
create or replace function public.assert_active_moderator(actor_user_id uuid)
returns public.app_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin
  select ur.role into actor_role
  from public.user_roles ur
  join public.memberships m on m.user_id = ur.user_id and m.status = 'active'
  where ur.user_id = actor_user_id;

  if coalesce(actor_role::text, '') not in ('admin', 'mod') then
    raise exception 'moderator access required' using errcode = '42501';
  end if;
  return actor_role;
end;
$$;

create or replace function public.moderate_report(
  target_report_id bigint,
  actor_user_id uuid,
  decision text
)
returns public.content_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  report public.content_reports;
  target_author uuid;
  target_status public.content_status;
  new_report_status public.report_status;
  new_entity_status public.content_status;
begin
  perform public.assert_active_moderator(actor_user_id);

  -- Fixed decision -> (report status, content status). A NULL content status
  -- leaves the content unchanged.
  case decision
    when 'approve' then new_report_status := 'reviewed'; new_entity_status := 'active';
    when 'archive' then new_report_status := 'reviewed'; new_entity_status := 'archived';
    when 'dismiss' then new_report_status := 'dismissed'; new_entity_status := null;
    else raise exception 'invalid moderation decision' using errcode = '22023';
  end case;

  select * into report from public.content_reports where id = target_report_id for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;
  if report.status is distinct from 'pending' then
    raise exception 'report is already resolved' using errcode = '55000';
  end if;
  if report.reporter_id = actor_user_id then
    raise exception 'moderators cannot decide reports they filed' using errcode = '42501';
  end if;

  select t.author_id, t.status into target_author, target_status
  from public.lock_report_target(report.entity_kind, report.entity_id) t;
  if target_status is null then
    raise exception 'reported content not found' using errcode = 'P0002';
  end if;
  if target_author = actor_user_id then
    raise exception 'moderators cannot decide reports on their own content' using errcode = '42501';
  end if;
  if target_status = 'deleted' and new_entity_status is not null then
    raise exception 'deleted content cannot be restored or archived' using errcode = '55000';
  end if;

  if new_entity_status is not null and new_entity_status is distinct from target_status then
    if report.entity_kind = 'post' then
      update public.posts set status = new_entity_status, moderated_by_id = actor_user_id
      where id = report.entity_id;
    else
      execute format('update public.%I set status = $1 where id = $2', public.report_target_table(report.entity_kind))
        using new_entity_status, report.entity_id;
    end if;
  end if;

  update public.content_reports
  set status = new_report_status,
      reviewed_by_id = actor_user_id,
      review_action = decision,
      reviewed_at = now()
  where id = target_report_id
  returning * into report;

  insert into public.security_audit_events
    (actor_id, action, target_type, target_id, metadata)
  values
    (actor_user_id, 'content_report.decided', 'content_report', target_report_id::text,
     jsonb_build_object(
       'decision', decision,
       'entityKind', report.entity_kind,
       'entityId', report.entity_id,
       'previousEntityStatus', target_status,
       'newEntityStatus', coalesce(new_entity_status, target_status)
     ));

  return report;
end;
$$;

-- Identity disclosure consumes the report it relies on, so one report allows
-- one disclosure, and a moderator cannot use a report they filed.
create or replace function public.disclose_anonymous_post_author(
  target_post_id bigint,
  target_report_id bigint,
  actor_user_id uuid,
  reason text
)
returns table (user_id uuid, display_name text, handle text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  report public.content_reports;
  post_author uuid;
begin
  perform public.assert_active_moderator(actor_user_id);
  if length(trim(coalesce(reason, ''))) < 12 then
    raise exception 'a disclosure justification of at least 12 characters is required';
  end if;

  select * into report from public.content_reports cr
  where cr.id = target_report_id
    and cr.entity_kind = 'post'
    and cr.entity_id = target_post_id
  for update;
  if not found or report.status is distinct from 'pending' then
    raise exception 'a matching unresolved report is required';
  end if;
  if report.reporter_id = actor_user_id then
    raise exception 'moderators cannot act on reports they filed' using errcode = '42501';
  end if;

  select p.author_id into post_author from public.posts p
  where p.id = target_post_id and p.is_anonymous = true;
  if post_author is null then raise exception 'anonymous post not found'; end if;
  if post_author = actor_user_id then
    raise exception 'moderators cannot act on reports about their own content' using errcode = '42501';
  end if;

  update public.content_reports
  set status = 'reviewed',
      reviewed_by_id = actor_user_id,
      review_action = 'identity_disclosed',
      reviewed_at = now()
  where id = target_report_id;

  insert into public.security_audit_events
    (actor_id, action, target_type, target_id, justification, metadata)
  values
    (actor_user_id, 'anonymous_post.identity_disclosed', 'post', target_post_id::text,
     trim(reason), jsonb_build_object('reportId', target_report_id));

  return query select p.id, p.display_name, p.handle
  from public.profiles p where p.id = post_author;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Fail-closed role check in admin_set_user_role
-- -----------------------------------------------------------------------------
-- `actor_role <> 'admin'` is NULL when the actor has no role row, and an IF
-- whose condition is NULL skips the raise. Same body otherwise.
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.app_role,
  actor_user_id uuid,
  reason text
)
returns public.app_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  old_role public.app_role;
  admin_count integer;
begin
  select ur.role into actor_role from public.user_roles ur where ur.user_id = actor_user_id;
  if actor_role is distinct from 'admin' or not exists (
    select 1 from public.memberships m where m.user_id = actor_user_id and m.status = 'active'
  ) then
    raise exception 'administrator access required';
  end if;
  if target_user_id = actor_user_id and new_role is distinct from 'admin' then
    raise exception 'administrators cannot change their own role';
  end if;
  if length(trim(coalesce(reason, ''))) < 8 then
    raise exception 'a role-change reason of at least 8 characters is required';
  end if;

  select role into old_role from public.user_roles where user_id = target_user_id for update;
  if old_role is null then raise exception 'target user not found'; end if;

  if old_role = 'admin' and new_role is distinct from 'admin' then
    select count(*) into admin_count
    from public.user_roles ur
    join public.memberships m on m.user_id = ur.user_id
    where ur.role = 'admin' and m.status = 'active';
    if admin_count <= 1 then raise exception 'cannot remove the final active administrator'; end if;
  end if;

  update public.user_roles
  set role = new_role, granted_by = actor_user_id, updated_at = now()
  where user_id = target_user_id;

  insert into public.security_audit_events
    (actor_id, action, target_type, target_id, justification, metadata)
  values
    (actor_user_id, 'user.role_changed', 'user', target_user_id::text, trim(reason),
     jsonb_build_object('oldRole', old_role, 'newRole', new_role));
  return new_role;
end;
$$;

-- These functions take the actor as an argument, so only the API may call them.
revoke execute on function public.report_target_table(public.entity_kind) from anon, authenticated, public;
revoke execute on function public.lock_report_target(public.entity_kind, bigint) from anon, authenticated, public;
revoke execute on function public.assert_active_moderator(uuid) from anon, authenticated, public;
revoke execute on function public.moderate_report(bigint, uuid, text) from anon, authenticated, public;
revoke execute on function public.disclose_anonymous_post_author(bigint, bigint, uuid, text) from anon, authenticated, public;
revoke execute on function public.admin_set_user_role(uuid, public.app_role, uuid, text) from anon, authenticated, public;
grant execute on function public.report_target_table(public.entity_kind) to service_role;
grant execute on function public.lock_report_target(public.entity_kind, bigint) to service_role;
grant execute on function public.assert_active_moderator(uuid) to service_role;
grant execute on function public.moderate_report(bigint, uuid, text) to service_role;
grant execute on function public.disclose_anonymous_post_author(bigint, bigint, uuid, text) to service_role;
grant execute on function public.admin_set_user_role(uuid, public.app_role, uuid, text) to service_role;

notify pgrst, 'reload schema';
