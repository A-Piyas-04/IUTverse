-- Critical security remediation: authoritative membership/roles, private profiles,
-- enforced IUT signup, anonymous-content protection, and immutable auditing.

do $$ begin
  create type public.membership_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_source as enum ('iut_domain', 'grandfather', 'admin');
exception when duplicate_object then null; end $$;

create table if not exists public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.membership_status not null default 'active',
  source public.membership_source not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'user',
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  student_id text unique,
  privacy jsonb not null default '{"residence":false,"studentId":false,"contact":false}'::jsonb,
  college_name text,
  school_name text,
  hometown text,
  current_program text,
  current_year text,
  current_semester text,
  current_hall text,
  current_residence text,
  current_room text,
  current_bed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_audit_events (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  justification text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_actor_created_idx
  on public.security_audit_events (actor_id, created_at desc);
create index if not exists security_audit_target_created_idx
  on public.security_audit_events (target_type, target_id, created_at desc);

-- Preserve private profile data before application reads switch to profile_private.
insert into public.profile_private (
  user_id, student_id, privacy, college_name, school_name, hometown,
  current_program, current_year, current_semester, current_hall,
  current_residence, current_room, current_bed
)
select
  id, student_id, coalesce(privacy, '{}'::jsonb), college_name, school_name,
  hometown, current_program, current_year, current_semester, current_hall,
  current_residence, current_room, current_bed
from public.profiles
on conflict (user_id) do update set
  student_id = excluded.student_id,
  privacy = excluded.privacy,
  college_name = excluded.college_name,
  school_name = excluded.school_name,
  hometown = excluded.hometown,
  current_program = excluded.current_program,
  current_year = excluded.current_year,
  current_semester = excluded.current_semester,
  current_hall = excluded.current_hall,
  current_residence = excluded.current_residence,
  current_room = excluded.current_room,
  current_bed = excluded.current_bed;

-- Existing non-IUT users are intentionally grandfathered. New accounts are added
-- only by the hardened auth-user trigger below.
insert into public.memberships (user_id, status, source)
select
  p.id,
  'active'::public.membership_status,
  case
    when lower(split_part(u.email, '@', 2)) = 'iut-dhaka.edu'
      then 'iut_domain'::public.membership_source
    else 'grandfather'::public.membership_source
  end
from public.profiles p
join auth.users u on u.id = p.id
on conflict (user_id) do nothing;

-- Current profile roles are not trusted. Reset all accounts to the least privilege;
-- the deployment bootstrap script restores an explicit allowlist.
insert into public.user_roles (user_id, role)
select id, 'user'::public.app_role from public.profiles
on conflict (user_id) do update set role = 'user', granted_by = null, updated_at = now();

alter table public.memberships enable row level security;
alter table public.user_roles enable row level security;
alter table public.profile_private enable row level security;
alter table public.security_audit_events enable row level security;

drop trigger if exists memberships_touch_updated_at on public.memberships;
create trigger memberships_touch_updated_at before update on public.memberships
for each row execute procedure public.touch_updated_at();
drop trigger if exists user_roles_touch_updated_at on public.user_roles;
create trigger user_roles_touch_updated_at before update on public.user_roles
for each row execute procedure public.touch_updated_at();
drop trigger if exists profile_private_touch_updated_at on public.profile_private;
create trigger profile_private_touch_updated_at before update on public.profile_private
for each row execute procedure public.touch_updated_at();

revoke all on public.memberships from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.profile_private from anon, authenticated;
revoke all on public.security_audit_events from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.posts from anon, authenticated;
revoke all on public.post_comments from anon, authenticated;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ur.role from public.user_roles ur where ur.user_id = auth.uid()),
    'user'::public.app_role
  );
$$;

create or replace function public.is_admin_or_mod()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_member()
    and public.current_app_role() in ('admin'::public.app_role, 'mod'::public.app_role);
$$;

grant execute on function public.is_active_member() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin_or_mod() to authenticated;
revoke execute on function public.is_active_member() from anon, public;
revoke execute on function public.current_app_role() from anon, public;
revoke execute on function public.is_admin_or_mod() from anon, public;

-- A restrictive policy is ANDed with every existing permissive policy. This adds
-- one membership gate without duplicating every ownership predicate.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'departments', 'post_categories', 'post_category_links', 'post_reactions',
    'lost_and_found_posts', 'jobs', 'job_applications', 'job_comments',
    'academic_resources', 'cat_posts', 'cat_post_likes', 'cat_post_comments',
    'cat_questions', 'cat_answers', 'confessions', 'confession_reactions',
    'confession_polls', 'confession_poll_options', 'confession_poll_votes',
    'conversations', 'conversation_participants', 'chat_messages', 'events',
    'event_rsvps', 'saved_items', 'content_reports', 'post_mutes',
    'post_poll_votes', 'post_polls', 'post_poll_options',
    'academic_resource_feedback', 'academic_resource_comments',
    'confession_comments', 'conversation_contexts', 'issue_reports'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists active_members_only on public.%I', table_name);
      execute format(
        'create policy active_members_only on public.%I as restrictive for all to authenticated using (public.is_active_member()) with check (public.is_active_member())',
        table_name
      );
    end if;
  end loop;
end $$;

drop policy if exists active_members_only on storage.objects;
create policy active_members_only
  on storage.objects as restrictive for all to authenticated
  using (public.is_active_member())
  with check (public.is_active_member());

drop policy if exists "profiles readable by authenticated users" on public.profiles;
drop policy if exists "profiles update own row" on public.profiles;
drop policy if exists "profiles insert own row" on public.profiles;
drop policy if exists "profiles moderator access" on public.profiles;
drop policy if exists "active posts readable" on public.posts;
drop policy if exists "active post comments readable" on public.post_comments;

-- Domain enforcement runs inside Supabase Auth before auth.users is inserted.
create or replace function public.hook_restrict_iut_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_email text := lower(trim(event->'user'->>'email'));
begin
  if candidate_email is null
     or candidate_email !~ '^[^@[:space:]]+@iut-dhaka[.]edu$' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Only verified IUT email addresses may create an account.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_restrict_iut_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_iut_signup(jsonb) from anon, authenticated, public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.profile_private (user_id) values (new.id)
  on conflict (user_id) do nothing;

  if lower(split_part(new.email, '@', 2)) = 'iut-dhaka.edu' then
    insert into public.memberships (user_id, status, source)
    values (new.id, 'active', 'iut_domain')
    on conflict (user_id) do nothing;

    insert into public.user_roles (user_id, role)
    values (new.id, 'user')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'security audit events are immutable';
end;
$$;

drop trigger if exists security_audit_events_immutable on public.security_audit_events;
create trigger security_audit_events_immutable
before update or delete on public.security_audit_events
for each row execute procedure public.prevent_audit_mutation();

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
  if actor_role <> 'admin' or not exists (
    select 1 from public.memberships m where m.user_id = actor_user_id and m.status = 'active'
  ) then
    raise exception 'administrator access required';
  end if;
  if target_user_id = actor_user_id and new_role <> 'admin' then
    raise exception 'administrators cannot change their own role';
  end if;
  if length(trim(coalesce(reason, ''))) < 8 then
    raise exception 'a role-change reason of at least 8 characters is required';
  end if;

  select role into old_role from public.user_roles where user_id = target_user_id for update;
  if old_role is null then raise exception 'target user not found'; end if;

  if old_role = 'admin' and new_role <> 'admin' then
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
  actor_role public.app_role;
  post_author uuid;
begin
  select ur.role into actor_role from public.user_roles ur where ur.user_id = actor_user_id;
  if actor_role not in ('admin', 'mod') or not exists (
    select 1 from public.memberships m where m.user_id = actor_user_id and m.status = 'active'
  ) then
    raise exception 'moderator access required';
  end if;
  if length(trim(coalesce(reason, ''))) < 12 then
    raise exception 'a disclosure justification of at least 12 characters is required';
  end if;
  if not exists (
    select 1 from public.content_reports
    where id = target_report_id and entity_kind = 'post'
      and entity_id = target_post_id and status = 'pending'
  ) then
    raise exception 'a matching unresolved report is required';
  end if;

  select author_id into post_author from public.posts
  where id = target_post_id and is_anonymous = true;
  if post_author is null then raise exception 'anonymous post not found'; end if;

  insert into public.security_audit_events
    (actor_id, action, target_type, target_id, justification, metadata)
  values
    (actor_user_id, 'anonymous_post.identity_disclosed', 'post', target_post_id::text,
     trim(reason), jsonb_build_object('reportId', target_report_id));

  return query select p.id, p.display_name, p.handle
  from public.profiles p where p.id = post_author;
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, public.app_role, uuid, text) from anon, authenticated, public;
revoke execute on function public.disclose_anonymous_post_author(bigint, bigint, uuid, text) from anon, authenticated, public;
grant execute on function public.admin_set_user_role(uuid, public.app_role, uuid, text) to service_role;
grant execute on function public.disclose_anonymous_post_author(bigint, bigint, uuid, text) to service_role;

-- The active clients use Realtime only for chat. Raw post payloads would expose
-- anonymous author_id, so remove these tables from the publication.
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
    alter publication supabase_realtime drop table public.posts;
  end if;
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_comments') then
    alter publication supabase_realtime drop table public.post_comments;
  end if;
end $$;
