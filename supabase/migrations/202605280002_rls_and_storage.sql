-- RLS and Storage policies for the Supabase-native schema.

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.post_categories enable row level security;
alter table public.posts enable row level security;
alter table public.post_category_links enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.lost_and_found_posts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_comments enable row level security;
alter table public.academic_resources enable row level security;
alter table public.cat_posts enable row level security;
alter table public.cat_post_likes enable row level security;
alter table public.cat_post_comments enable row level security;
alter table public.cat_questions enable row level security;
alter table public.cat_answers enable row level security;
alter table public.confessions enable row level security;
alter table public.confession_reactions enable row level security;
alter table public.confession_polls enable row level security;
alter table public.confession_poll_options enable row level security;
alter table public.confession_poll_votes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.legacy_user_map enable row level security;

create policy "departments readable by authenticated users"
  on public.departments for select
  to authenticated
  using (true);

create policy "profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles update own row"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles insert own row"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles moderator access"
  on public.profiles for all
  to authenticated
  using (public.is_admin_or_mod())
  with check (public.is_admin_or_mod());

create policy "post categories readable"
  on public.post_categories for select
  to authenticated
  using (true);

create policy "active posts readable"
  on public.posts for select
  to authenticated
  using (status = 'active' or author_id = auth.uid() or public.is_admin_or_mod());

create policy "users create own posts"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "users update own posts"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin_or_mod())
  with check (author_id = auth.uid() or public.is_admin_or_mod());

create policy "users delete own posts"
  on public.posts for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin_or_mod());

create policy "post category links readable"
  on public.post_category_links for select
  to authenticated
  using (true);

create policy "post category links owned through post"
  on public.post_category_links for all
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_admin_or_mod())))
  with check (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_admin_or_mod())));

create policy "active post comments readable"
  on public.post_comments for select
  to authenticated
  using (status = 'active' or author_id = auth.uid() or public.is_admin_or_mod());

create policy "users create own post comments"
  on public.post_comments for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "users update own post comments"
  on public.post_comments for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin_or_mod())
  with check (author_id = auth.uid() or public.is_admin_or_mod());

create policy "users delete own post comments"
  on public.post_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin_or_mod());

create policy "post reactions visible"
  on public.post_reactions for select
  to authenticated
  using (true);

create policy "users manage own post reactions"
  on public.post_reactions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lost and found readable"
  on public.lost_and_found_posts for select
  to authenticated
  using (status <> 'deleted' or user_id = auth.uid() or public.is_admin_or_mod());

create policy "users create own lost and found"
  on public.lost_and_found_posts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update own lost and found"
  on public.lost_and_found_posts for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod())
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "users delete own lost and found"
  on public.lost_and_found_posts for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod());

create policy "jobs readable"
  on public.jobs for select
  to authenticated
  using (status = 'active' or posted_by_id = auth.uid() or public.is_admin_or_mod());

create policy "users create own jobs"
  on public.jobs for insert
  to authenticated
  with check (posted_by_id = auth.uid());

create policy "users update own jobs"
  on public.jobs for update
  to authenticated
  using (posted_by_id = auth.uid() or public.is_admin_or_mod())
  with check (posted_by_id = auth.uid() or public.is_admin_or_mod());

create policy "users delete own jobs"
  on public.jobs for delete
  to authenticated
  using (posted_by_id = auth.uid() or public.is_admin_or_mod());

create policy "job applications readable by applicant or poster"
  on public.job_applications for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.posted_by_id = auth.uid())
    or public.is_admin_or_mod()
  );

create policy "users manage own job applications"
  on public.job_applications for all
  to authenticated
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

create policy "job comments readable"
  on public.job_comments for select
  to authenticated
  using (true);

create policy "users manage own job comments"
  on public.job_comments for all
  to authenticated
  using (author_id = auth.uid() or public.is_admin_or_mod())
  with check (author_id = auth.uid() or public.is_admin_or_mod());

create policy "academic resources readable"
  on public.academic_resources for select
  to authenticated
  using (status = 'active' or uploaded_by_id = auth.uid() or public.is_admin_or_mod());

create policy "users create own academic resources"
  on public.academic_resources for insert
  to authenticated
  with check (uploaded_by_id = auth.uid());

create policy "users update own academic resources"
  on public.academic_resources for update
  to authenticated
  using (uploaded_by_id = auth.uid() or public.is_admin_or_mod())
  with check (uploaded_by_id = auth.uid() or public.is_admin_or_mod());

create policy "users delete own academic resources"
  on public.academic_resources for delete
  to authenticated
  using (uploaded_by_id = auth.uid() or public.is_admin_or_mod());

create policy "cat content readable"
  on public.cat_posts for select
  to authenticated
  using (status = 'active' or user_id = auth.uid() or public.is_admin_or_mod());

create policy "users manage own cat posts"
  on public.cat_posts for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod())
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "cat post likes visible"
  on public.cat_post_likes for select
  to authenticated
  using (true);

create policy "users manage own cat post likes"
  on public.cat_post_likes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cat post comments readable"
  on public.cat_post_comments for select
  to authenticated
  using (true);

create policy "users manage own cat post comments"
  on public.cat_post_comments for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod())
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "cat qa readable"
  on public.cat_questions for select
  to authenticated
  using (status = 'active' or user_id = auth.uid() or public.is_admin_or_mod());

create policy "users manage own cat questions"
  on public.cat_questions for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod())
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "cat answers readable"
  on public.cat_answers for select
  to authenticated
  using (status = 'active' or user_id = auth.uid() or public.is_admin_or_mod());

create policy "users manage own cat answers"
  on public.cat_answers for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod())
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "confessions readable"
  on public.confessions for select
  to authenticated
  using (status = 'active' or public.is_admin_or_mod());

create policy "authenticated users create confessions"
  on public.confessions for insert
  to authenticated
  with check (true);

create policy "moderators manage confessions"
  on public.confessions for update
  to authenticated
  using (public.is_admin_or_mod())
  with check (public.is_admin_or_mod());

create policy "confession reactions visible"
  on public.confession_reactions for select
  to authenticated
  using (true);

create policy "users manage own confession reactions"
  on public.confession_reactions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "polls readable"
  on public.confession_polls for select
  to authenticated
  using (true);

create policy "poll options readable"
  on public.confession_poll_options for select
  to authenticated
  using (true);

create policy "poll votes own rows"
  on public.confession_poll_votes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "conversation participants read own conversations"
  on public.conversation_participants for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_mod());

create policy "conversation participants insert own membership"
  on public.conversation_participants for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin_or_mod());

create policy "conversations readable by participant"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
    or public.is_admin_or_mod()
  );

create policy "authenticated users create conversations"
  on public.conversations for insert
  to authenticated
  with check (true);

create policy "chat messages readable by participant"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
    or public.is_admin_or_mod()
  );

create policy "participants send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "events readable"
  on public.events for select
  to authenticated
  using (is_public or created_by_id = auth.uid() or public.is_admin_or_mod());

create policy "users manage own events"
  on public.events for all
  to authenticated
  using (created_by_id = auth.uid() or public.is_admin_or_mod())
  with check (created_by_id = auth.uid() or public.is_admin_or_mod());

create policy "rsvps visible to authenticated"
  on public.event_rsvps for select
  to authenticated
  using (true);

create policy "users manage own rsvps"
  on public.event_rsvps for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "legacy map service role only"
  on public.legacy_user_map for all
  using (false)
  with check (false);

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('post-media', 'post-media', true),
  ('lost-found', 'lost-found', true),
  ('cat-posts', 'cat-posts', true),
  ('academic-resources', 'academic-resources', false)
on conflict (id) do nothing;

create policy "authenticated users read public app media"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts'));

create policy "authenticated users read academic resources"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'academic-resources');

create policy "users upload own app media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts', 'academic-resources')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own app media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts', 'academic-resources')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_mod())
  )
  with check (
    bucket_id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts', 'academic-resources')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_mod())
  );

create policy "users delete own app media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'post-media', 'lost-found', 'cat-posts', 'academic-resources')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin_or_mod())
  );
