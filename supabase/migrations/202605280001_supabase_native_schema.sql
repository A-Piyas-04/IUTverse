-- IUTverse Supabase-native schema foundation.
-- Run with Supabase CLI or through the SQL editor after creating the project.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('user', 'mod', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_status as enum ('active', 'resolved', 'archived', 'deleted', 'flagged');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.lost_found_type as enum ('lost', 'found');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reaction_type as enum ('like', 'funny', 'relatable', 'angry', 'insightful', 'helpful', 'wholesome');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.conversation_type as enum ('direct', 'group');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.rsvp_status as enum ('going', 'interested', 'not_going');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.job_type as enum ('Internship', 'Freelance', 'PartTime', 'Volunteer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.resource_type as enum ('QUESTION', 'NOTE', 'BOOK', 'OTHER', 'CLASS_LECTURE');
exception when duplicate_object then null;
end $$;

create table if not exists public.departments (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_user_id integer unique,
  display_name text,
  department_id bigint references public.departments(id) on delete set null,
  batch integer,
  student_id text unique,
  role public.app_role not null default 'user',
  bio text,
  interests text[] not null default '{}',
  badges text[] not null default '{}',
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
  profile_image_path text,
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id bigserial primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  image_path text,
  image_bucket text,
  image_mime_type text,
  image_size_bytes bigint,
  reaction_count integer not null default 0,
  comment_count integer not null default 0,
  status public.content_status not null default 'active',
  reported_count integer not null default 0,
  moderated_by_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_category_links (
  post_id bigint not null references public.posts(id) on delete cascade,
  category_id bigint not null references public.post_categories(id) on delete cascade,
  primary key (post_id, category_id)
);

create table if not exists public.post_comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.post_comments(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.lost_and_found_posts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.lost_found_type not null,
  title text not null,
  description text not null,
  location text not null,
  contact text not null,
  image_path text,
  image_bucket text,
  image_mime_type text,
  image_size_bytes bigint,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id bigserial primary key,
  title text not null,
  type public.job_type not null,
  description text not null,
  requirements text[] not null default '{}',
  compensation text,
  deadline timestamptz,
  posted_by_id uuid not null references public.profiles(id) on delete cascade,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id bigserial primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  applied_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create table if not exists public.job_comments (
  id bigserial primary key,
  job_id bigint not null references public.jobs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.job_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_resources (
  id bigserial primary key,
  title text not null,
  type public.resource_type not null,
  department_id bigint not null references public.departments(id) on delete restrict,
  course_code text,
  file_path text,
  file_bucket text,
  file_mime_type text,
  file_size_bytes bigint,
  external_link text,
  uploaded_by_id uuid references public.profiles(id) on delete set null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_resource_has_file_or_link check (file_path is not null or external_link is not null)
);

create unique index if not exists academic_resources_dedupe_idx
  on public.academic_resources (department_id, coalesce(course_code, ''), type, lower(title));

create table if not exists public.cat_posts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null,
  image_path text,
  image_bucket text,
  image_mime_type text,
  image_size_bytes bigint,
  like_count integer not null default 0,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_post_likes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cat_post_id bigint not null references public.cat_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, cat_post_id)
);

create table if not exists public.cat_post_comments (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cat_post_id bigint not null references public.cat_posts(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_questions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_answers (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id bigint not null references public.cat_questions(id) on delete cascade,
  answer text not null,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.confessions (
  id bigserial primary key,
  content text not null,
  tag text not null,
  reaction_count integer not null default 0,
  status public.content_status not null default 'active',
  reported_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.confession_reactions (
  id bigserial primary key,
  confession_id bigint not null references public.confessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (confession_id, user_id)
);

create table if not exists public.confession_polls (
  id bigserial primary key,
  confession_id bigint not null unique references public.confessions(id) on delete cascade,
  question text not null,
  total_votes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.confession_poll_options (
  id bigserial primary key,
  poll_id bigint not null references public.confession_polls(id) on delete cascade,
  text text not null,
  vote_count integer not null default 0,
  order_index integer not null
);

create table if not exists public.confession_poll_votes (
  id bigserial primary key,
  poll_id bigint not null references public.confession_polls(id) on delete cascade,
  option_id bigint not null references public.confession_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.conversations (
  id bigserial primary key,
  conversation_type public.conversation_type not null default 'direct',
  title text,
  direct_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.events (
  id bigserial primary key,
  title text not null,
  description text not null,
  location text not null,
  event_date timestamptz not null,
  created_by_id uuid not null references public.profiles(id) on delete cascade,
  is_public boolean not null default true,
  status public.content_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id bigint not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.legacy_user_map (
  legacy_user_id integer primary key,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  migrated_at timestamptz not null default now()
);

create index if not exists profiles_department_batch_idx on public.profiles (department_id, batch);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_status_created_idx on public.posts (status, created_at desc);
create index if not exists post_comments_post_created_idx on public.post_comments (post_id, created_at desc);
create index if not exists lost_found_filter_idx on public.lost_and_found_posts (type, status, created_at desc);
create index if not exists chat_messages_conversation_sent_idx on public.chat_messages (conversation_id, sent_at desc);
create index if not exists conversation_participants_user_idx on public.conversation_participants (user_id);
create index if not exists academic_resources_filter_idx on public.academic_resources (department_id, type, course_code);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_or_mod()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'mod')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.increment_post_reaction_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set reaction_count = reaction_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_reaction_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set reaction_count = greatest(reaction_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_reaction_insert_count on public.post_reactions;
create trigger post_reaction_insert_count
  after insert on public.post_reactions
  for each row execute procedure public.increment_post_reaction_count();

drop trigger if exists post_reaction_delete_count on public.post_reactions;
create trigger post_reaction_delete_count
  after delete on public.post_reactions
  for each row execute procedure public.decrement_post_reaction_count();

create or replace function public.increment_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_comment_insert_count on public.post_comments;
create trigger post_comment_insert_count
  after insert on public.post_comments
  for each row execute procedure public.increment_post_comment_count();

drop trigger if exists post_comment_delete_count on public.post_comments;
create trigger post_comment_delete_count
  after delete on public.post_comments
  for each row execute procedure public.decrement_post_comment_count();

create or replace function public.increment_confession_vote_counts()
returns trigger
language plpgsql
as $$
begin
  update public.confession_poll_options set vote_count = vote_count + 1 where id = new.option_id;
  update public.confession_polls set total_votes = total_votes + 1 where id = new.poll_id;
  return new;
end;
$$;

drop trigger if exists confession_poll_vote_insert_count on public.confession_poll_votes;
create trigger confession_poll_vote_insert_count
  after insert on public.confession_poll_votes
  for each row execute procedure public.increment_confession_vote_counts();

create or replace function public.set_direct_conversation_key()
returns trigger
language plpgsql
as $$
declare
  participant_ids uuid[];
begin
  if new.conversation_type <> 'direct' then
    return new;
  end if;

  select array_agg(user_id order by user_id)
  into participant_ids
  from public.conversation_participants
  where conversation_id = new.id;

  if array_length(participant_ids, 1) = 2 then
    new.direct_key = participant_ids[1]::text || ':' || participant_ids[2]::text;
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'posts', 'post_comments', 'lost_and_found_posts', 'jobs',
    'job_comments', 'academic_resources', 'cat_posts', 'cat_post_comments',
    'cat_questions', 'cat_answers', 'conversations', 'events', 'event_rsvps'
  ]
  loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I for each row execute procedure public.touch_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;
