-- IUTverse frontend V2 additive domain support.
do $$ begin create type public.entity_kind as enum ('post','comment','resource','job','lost_found','confession','cat_post','event'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('pending','reviewed','dismissed'); exception when duplicate_object then null; end $$;

alter type public.resource_type add value if not exists 'PDF';
alter type public.resource_type add value if not exists 'SLIDES';
alter type public.resource_type add value if not exists 'LAB_MANUAL';
alter type public.resource_type add value if not exists 'QUESTION_SOLUTION';
alter type public.resource_type add value if not exists 'LINK';
alter type public.resource_type add value if not exists 'VIDEO';
alter type public.resource_type add value if not exists 'DATASET';
alter type public.job_type add value if not exists 'Job';
alter type public.job_type add value if not exists 'Research';
alter type public.job_type add value if not exists 'Project';
alter type public.job_type add value if not exists 'ClubRole';
alter type public.job_type add value if not exists 'Competition';

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists privacy jsonb not null default '{"residence":false,"studentId":false,"contact":false}'::jsonb;
create unique index if not exists profiles_handle_unique on public.profiles (lower(handle)) where handle is not null;

alter table public.posts add column if not exists audience_department_id bigint references public.departments(id) on delete set null;
alter table public.posts add column if not exists audience_batch integer;
alter table public.posts add column if not exists muted_count integer not null default 0;

alter table public.academic_resources add column if not exists description text;
alter table public.academic_resources add column if not exists tags text[] not null default '{}';
alter table public.academic_resources add column if not exists helpful_count integer not null default 0;
alter table public.academic_resources add column if not exists comment_count integer not null default 0;

alter table public.jobs add column if not exists organization text;
alter table public.jobs add column if not exists format text;
alter table public.jobs add column if not exists skills text[] not null default '{}';
alter table public.jobs add column if not exists department text;

alter table public.lost_and_found_posts add column if not exists category text;
alter table public.lost_and_found_posts add column if not exists occurred_at timestamptz;
alter table public.lost_and_found_posts add column if not exists contact_preference text not null default 'message';
alter table public.lost_and_found_posts add column if not exists contact_note text;
alter table public.lost_and_found_posts add column if not exists return_location text;
alter table public.lost_and_found_posts add column if not exists availability text;
alter table public.lost_and_found_posts add column if not exists privacy_accepted boolean not null default false;

alter table public.cat_posts add column if not exists category text not null default 'Update';
alter table public.cat_posts add column if not exists location text;

alter table public.events add column if not exists type text not null default 'General';
alter table public.events add column if not exists club_name text;
alter table public.events add column if not exists category text;
alter table public.events add column if not exists image_path text;
alter table public.events add column if not exists image_bucket text;

alter table public.chat_messages add column if not exists attachment_path text;
alter table public.chat_messages add column if not exists attachment_bucket text;
alter table public.chat_messages add column if not exists attachment_name text;
alter table public.chat_messages add column if not exists attachment_mime_type text;
alter table public.chat_messages add column if not exists attachment_size_bytes bigint;

create table if not exists public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_kind public.entity_kind not null,
  entity_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_kind, entity_id)
);

create table if not exists public.content_reports (
  id bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  entity_kind public.entity_kind not null,
  entity_id bigint not null,
  reason text not null,
  details text,
  status public.report_status not null default 'pending',
  reviewed_by_id uuid references public.profiles(id) on delete set null,
  review_action text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, entity_kind, entity_id, reason)
);

create table if not exists public.post_mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id bigint not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.post_polls (
  id bigserial primary key,
  post_id bigint not null unique references public.posts(id) on delete cascade,
  question text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.post_poll_options (
  id bigserial primary key,
  poll_id bigint not null references public.post_polls(id) on delete cascade,
  text text not null,
  position smallint not null
);
create table if not exists public.post_poll_votes (
  poll_id bigint not null references public.post_polls(id) on delete cascade,
  option_id bigint not null references public.post_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.academic_resource_feedback (
  resource_id bigint not null references public.academic_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, user_id)
);
create table if not exists public.academic_resource_comments (
  id bigserial primary key,
  resource_id bigint not null references public.academic_resources(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.academic_resource_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.confession_comments (
  id bigserial primary key,
  confession_id bigint not null references public.confessions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.confession_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_contexts (
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  entity_kind public.entity_kind not null,
  entity_id bigint not null,
  label text,
  created_at timestamptz not null default now(),
  primary key (conversation_id, entity_kind, entity_id)
);

create table if not exists public.issue_reports (
  id bigserial primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  issue_type text not null,
  description text not null,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists saved_items_entity_idx on public.saved_items (entity_kind, entity_id);
create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);
create index if not exists events_date_status_idx on public.events (event_date, status);
create index if not exists jobs_type_deadline_idx on public.jobs (type, deadline);
create index if not exists resource_feedback_resource_idx on public.academic_resource_feedback (resource_id);
create index if not exists resource_comments_resource_idx on public.academic_resource_comments (resource_id, created_at);
create index if not exists confession_comments_confession_idx on public.confession_comments (confession_id, created_at);

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do update set public = excluded.public;
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.saved_items enable row level security;
alter table public.content_reports enable row level security;
alter table public.post_mutes enable row level security;
alter table public.post_poll_votes enable row level security;
alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.academic_resource_feedback enable row level security;
alter table public.academic_resource_comments enable row level security;
alter table public.confession_comments enable row level security;
alter table public.conversation_contexts enable row level security;
alter table public.issue_reports enable row level security;

drop policy if exists "users manage saved items" on public.saved_items;
create policy "users manage saved items" on public.saved_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users create reports" on public.content_reports;
create policy "users create reports" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "users read own reports" on public.content_reports;
create policy "users read own reports" on public.content_reports for select to authenticated using (reporter_id = auth.uid());
drop policy if exists "users manage post mutes" on public.post_mutes;
create policy "users manage post mutes" on public.post_mutes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage resource feedback" on public.academic_resource_feedback;
create policy "users manage resource feedback" on public.academic_resource_feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage poll votes" on public.post_poll_votes;
create policy "users manage poll votes" on public.post_poll_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Polls, comments, conversation context and anonymous reply authorship are read
-- through the API's safe mappers. No direct client select policy is granted.
