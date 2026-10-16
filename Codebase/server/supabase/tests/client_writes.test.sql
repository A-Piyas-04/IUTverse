-- H-1 / M-1 / M-2: clients cannot write app tables or Storage directly.
-- Writes go through the API (service role), which enforces validation,
-- moderation state and rate limits.
begin;
\ir helpers/test_users.psql

select plan(33);

select pg_temp.create_member('a1000000-0000-0000-0000-00000000000a', 'owner.a@iut-dhaka.edu');
select pg_temp.create_member('b1000000-0000-0000-0000-00000000000b', 'other.b@iut-dhaka.edu');
select pg_temp.create_member('d1000000-0000-0000-0000-00000000000d', 'mod.d@iut-dhaka.edu', 'mod');

insert into public.departments (id, name) values (990001, 'Test Department') on conflict do nothing;

-- Content owned by A, archived by moderator D.
insert into public.jobs (id, title, type, description, posted_by_id, status)
values (990001, 'Archived job', 'Internship', 'x', 'a1000000-0000-0000-0000-00000000000a', 'archived');
insert into public.lost_and_found_posts (id, user_id, type, title, description, location, contact, status)
values (990001, 'a1000000-0000-0000-0000-00000000000a', 'lost', 't', 'd', 'l', 'c', 'archived');
insert into public.academic_resources (id, title, type, department_id, external_link, uploaded_by_id, status)
values (990001, 'Notes', 'NOTE', 990001, 'https://example.org', 'a1000000-0000-0000-0000-00000000000a', 'archived');
insert into public.cat_posts (id, user_id, caption, status)
values (990001, 'a1000000-0000-0000-0000-00000000000a', 'cat', 'archived');
insert into public.cat_questions (id, user_id, question, status)
values (990001, 'a1000000-0000-0000-0000-00000000000a', 'q?', 'archived');
insert into public.cat_answers (id, user_id, question_id, answer, status)
values (990001, 'a1000000-0000-0000-0000-00000000000a', 990001, 'a', 'archived');
insert into public.events (id, title, description, location, event_date, created_by_id, status)
values (990001, 'e', 'd', 'l', now(), 'a1000000-0000-0000-0000-00000000000a', 'archived');
insert into public.posts (id, author_id, content, status, moderated_by_id)
values (990001, 'a1000000-0000-0000-0000-00000000000a', 'p', 'archived', 'd1000000-0000-0000-0000-00000000000d');
insert into public.confessions (id, content, tag) values (990001, 'c', 'misc');

-- ------------------------------------------------- grants on every app table
select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and (has_table_privilege('authenticated', c.oid, 'UPDATE')
          or has_table_privilege('authenticated', c.oid, 'DELETE')
          or has_table_privilege('authenticated', c.oid, 'TRUNCATE'))),
  null,
  'authenticated has no UPDATE/DELETE/TRUNCATE on any public table'
);
select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and has_table_privilege('authenticated', c.oid, 'INSERT')),
  array['chat_messages'],
  'authenticated can INSERT only into chat_messages (participant-checked by RLS)'
);
select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and (has_table_privilege('anon', c.oid, 'INSERT')
          or has_table_privilege('anon', c.oid, 'UPDATE')
          or has_table_privilege('anon', c.oid, 'DELETE'))),
  null,
  'anon has no write privilege on any public table'
);

-- ------------------------------------------------- the content owner (A)
select pg_temp.act_as('a1000000-0000-0000-0000-00000000000a');

select throws_ok($$ update public.jobs set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their job');
select throws_ok($$ update public.lost_and_found_posts set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their lost & found post');
select throws_ok($$ update public.academic_resources set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their academic resource');
select throws_ok($$ update public.academic_resources set helpful_count = 9999 where id = 990001 $$,
  '42501', null, 'owner cannot forge helpful_count');
select throws_ok($$ update public.cat_posts set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their cat post');
select throws_ok($$ update public.cat_posts set like_count = 9999 where id = 990001 $$,
  '42501', null, 'owner cannot forge like_count');
select throws_ok($$ update public.cat_questions set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their cat question');
select throws_ok($$ update public.cat_answers set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their cat answer');
select throws_ok($$ update public.events set status = 'active' where id = 990001 $$,
  '42501', null, 'owner cannot un-archive their event');
select throws_ok($$ update public.posts set status = 'active', moderated_by_id = null where id = 990001 $$,
  '42501', null, 'owner cannot clear moderated_by_id or un-archive their post');
select throws_ok($$ update public.posts set reported_count = 0 where id = 990001 $$,
  '42501', null, 'owner cannot reset reported_count');
select throws_ok($$ delete from public.jobs where id = 990001 $$,
  '42501', null, 'owner cannot hard-delete their job');
select throws_ok(
  $$ insert into public.jobs (title, type, description, posted_by_id)
     values ('direct', 'Internship', 'x', 'a1000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'owner cannot create a job bypassing the API');
select throws_ok(
  $$ insert into public.content_reports (reporter_id, entity_kind, entity_id, reason, status, reviewed_by_id, review_action)
     values ('a1000000-0000-0000-0000-00000000000a', 'job', 990001, 'spam', 'reviewed',
             'd1000000-0000-0000-0000-00000000000d', 'approve') $$,
  '42501', null, 'member cannot forge a reviewed moderation record');
reset role;

-- ------------------------------------------------- a non-owner (B)
select pg_temp.act_as('b1000000-0000-0000-0000-00000000000b');

select throws_ok($$ update public.jobs set status = 'deleted' where id = 990001 $$,
  '42501', null, 'non-owner cannot change a job status');
select throws_ok($$ update public.cat_posts set like_count = 0 where id = 990001 $$,
  '42501', null, 'non-owner cannot change like_count');
select throws_ok($$ update public.confessions set reaction_count = 9999, reported_count = 0 where id = 990001 $$,
  '42501', null, 'non-owner cannot change confession counters');
select throws_ok($$ insert into public.confessions (content, tag) values ('direct', 'misc') $$,
  '42501', null, 'confessions cannot be inserted bypassing the API');
select throws_ok(
  $$ insert into public.job_comments (job_id, author_id, content)
     values (990001, 'b1000000-0000-0000-0000-00000000000b', 'direct') $$,
  '42501', null, 'job comments cannot be inserted bypassing the API');
select throws_ok(
  $$ insert into public.saved_items (user_id, entity_kind, entity_id)
     values ('b1000000-0000-0000-0000-00000000000b', 'job', 990001) $$,
  '42501', null, 'saved items cannot be inserted bypassing the API');
select throws_ok(
  $$ insert into public.event_rsvps (event_id, user_id) values (990001, 'b1000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'RSVPs cannot be inserted bypassing the API');
select throws_ok(
  $$ insert into public.post_poll_votes (poll_id, option_id, user_id) values (1, 1, 'b1000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'post poll votes cannot be inserted bypassing the API');
select throws_ok(
  $$ insert into public.confession_poll_votes (poll_id, option_id, user_id) values (1, 1, 'b1000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'confession poll votes cannot be inserted bypassing the API');
reset role;

-- ------------------------------------------------- a moderator (D)
-- Moderation also goes through the API, so even moderators cannot write directly.
select pg_temp.act_as('d1000000-0000-0000-0000-00000000000d');
select throws_ok($$ update public.jobs set status = 'active' where id = 990001 $$,
  '42501', null, 'moderators cannot bypass the moderation workflow either');
reset role;

select is(
  (select status::text from public.jobs where id = 990001),
  'archived',
  'the archived job is still archived'
);

-- ------------------------------------------------- Storage
select is(
  (select count(*)::int from storage.buckets
   where allowed_mime_types is null or file_size_limit is null),
  0,
  'every bucket has allowed_mime_types and file_size_limit'
);
select is(
  (select count(*)::int from storage.buckets
   where public and ('image/svg+xml' = any(allowed_mime_types) or 'text/html' = any(allowed_mime_types))),
  0,
  'no public bucket accepts SVG or HTML'
);
select is(
  (select file_size_limit from storage.buckets where id = 'avatars'),
  5242880::bigint,
  'image buckets are limited to 5 MB'
);
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
     and policyname <> 'active_members_only'),
  0,
  'no Storage policy lets clients write objects directly'
);

select pg_temp.act_as('a1000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('post-media', 'a1000000-0000-0000-0000-00000000000a/x.html', 'a1000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'members cannot write Storage objects directly');
reset role;

select * from finish();
rollback;
