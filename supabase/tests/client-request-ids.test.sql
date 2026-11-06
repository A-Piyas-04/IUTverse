-- Idempotency keys (202610290001): a member's retry key can be stored once per table, never twice, and any number
-- of rows without a key may exist. Different members may use the same key.
begin;
\ir helpers/test-users.psql

select plan(12);

select pg_temp.create_member('a4000000-0000-0000-0000-00000000000a', 'key.a@iut-dhaka.edu');
select pg_temp.create_member('b4000000-0000-0000-0000-00000000000b', 'key.b@iut-dhaka.edu');

insert into public.conversations (id, conversation_type, direct_key)
values (990401, 'direct', 'a4000000-0000-0000-0000-00000000000a:b4000000-0000-0000-0000-00000000000b');
insert into public.conversation_participants (conversation_id, user_id) values
  (990401, 'a4000000-0000-0000-0000-00000000000a'),
  (990401, 'b4000000-0000-0000-0000-00000000000b');

-- chat_messages
insert into public.chat_messages (conversation_id, sender_id, content, client_request_id)
values (990401, 'a4000000-0000-0000-0000-00000000000a', 'first', 'mobile-send-0123456789abcdef');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, client_request_id) values (990401, 'a4000000-0000-0000-0000-00000000000a', 'again', 'mobile-send-0123456789abcdef') $$,
  '23505', null, 'the same sender cannot store a message key twice');
select lives_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, client_request_id) values (990401, 'b4000000-0000-0000-0000-00000000000b', 'mine', 'mobile-send-0123456789abcdef') $$,
  'another member may use the same key');
select lives_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content) values (990401, 'a4000000-0000-0000-0000-00000000000a', 'no key 1'), (990401, 'a4000000-0000-0000-0000-00000000000a', 'no key 2') $$,
  'any number of messages without a key');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, client_request_id) values (990401, 'a4000000-0000-0000-0000-00000000000a', 'bad', 'short') $$,
  '23514', null, 'a malformed key is refused by the database too');

-- posts
insert into public.posts (author_id, content, client_request_id) values ('a4000000-0000-0000-0000-00000000000a', 'p1', 'mobile-post-0123456789abcdef');
select throws_ok(
  $$ insert into public.posts (author_id, content, client_request_id) values ('a4000000-0000-0000-0000-00000000000a', 'p2', 'mobile-post-0123456789abcdef') $$,
  '23505', null, 'the same author cannot store a post key twice');
select lives_ok(
  $$ insert into public.posts (author_id, content, client_request_id) values ('b4000000-0000-0000-0000-00000000000b', 'p3', 'mobile-post-0123456789abcdef') $$,
  'another author may use the same post key');
select lives_ok(
  $$ insert into public.posts (author_id, content) values ('a4000000-0000-0000-0000-00000000000a', 'no key 1'), ('a4000000-0000-0000-0000-00000000000a', 'no key 2') $$,
  'any number of posts without a key');

-- post_comments
insert into public.post_comments (post_id, author_id, content, client_request_id)
values ((select id from public.posts where content = 'p1'), 'a4000000-0000-0000-0000-00000000000a', 'c1', 'mobile-comment-0123456789ab');
select throws_ok(
  $$ insert into public.post_comments (post_id, author_id, content, client_request_id) values ((select id from public.posts where content = 'p1'), 'a4000000-0000-0000-0000-00000000000a', 'c2', 'mobile-comment-0123456789ab') $$,
  '23505', null, 'the same author cannot store a comment key twice');
select lives_ok(
  $$ insert into public.post_comments (post_id, author_id, content) values ((select id from public.posts where content = 'p1'), 'a4000000-0000-0000-0000-00000000000a', 'n1'), ((select id from public.posts where content = 'p1'), 'a4000000-0000-0000-0000-00000000000a', 'n2') $$,
  'any number of comments without a key');

-- the column is not something members can write themselves through the Data API
select pg_temp.act_as('a4000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, client_request_id) values (990401, 'a4000000-0000-0000-0000-00000000000a', 'direct', 'direct-insert-0123456789ab') $$,
  '42501', null, 'members still cannot insert chat messages directly, with or without a key');
reset role;

select is((select count(*)::int from public.chat_messages where client_request_id = 'mobile-send-0123456789abcdef'), 2, 'one row per sender for the shared key');
select is((select count(*)::int from public.posts where client_request_id is null and author_id = 'a4000000-0000-0000-0000-00000000000a'), 2, 'keyless rows are unaffected');

select * from finish();
rollback;
