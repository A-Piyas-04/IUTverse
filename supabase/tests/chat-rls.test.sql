-- C-1 / C-2: private chat isolation between two authenticated members.
begin;
\ir helpers/test-users.psql

select plan(12);

select pg_temp.create_member('a0000000-0000-0000-0000-00000000000a', 'chat.a@iut-dhaka.edu');
select pg_temp.create_member('b0000000-0000-0000-0000-00000000000b', 'chat.b@iut-dhaka.edu');
select pg_temp.create_member('c0000000-0000-0000-0000-00000000000c', 'chat.c@iut-dhaka.edu');

-- Conversation 1: A <-> C, with one message from A.
-- Conversation 2: B <-> C, so B participates in *some* conversation (the
-- condition the old tautological policy actually checked).
insert into public.conversations (id, conversation_type) values (910001, 'direct'), (910002, 'direct');
insert into public.conversation_participants (conversation_id, user_id) values
  (910001, 'a0000000-0000-0000-0000-00000000000a'),
  (910001, 'c0000000-0000-0000-0000-00000000000c'),
  (910002, 'b0000000-0000-0000-0000-00000000000b'),
  (910002, 'c0000000-0000-0000-0000-00000000000c');
insert into public.chat_messages (conversation_id, sender_id, content) values
  (910001, 'a0000000-0000-0000-0000-00000000000a', 'private to A and C'),
  (910002, 'b0000000-0000-0000-0000-00000000000b', 'private to B and C');

-- ---------------------------------------------------------------- user B
select pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');

select is_empty(
  $$ select 1 from public.chat_messages where conversation_id = 910001 $$,
  'B cannot read messages in the A<->C conversation'
);
select results_eq(
  $$ select count(*)::int from public.chat_messages $$,
  $$ values (1) $$,
  'B sees only the messages of their own conversation'
);
select is_empty(
  $$ select 1 from public.conversations where id = 910001 $$,
  'B cannot read the A<->C conversation row'
);
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content)
     values (910001, 'b0000000-0000-0000-0000-00000000000b', 'injected') $$,
  '42501', null,
  'B cannot post into the A<->C conversation'
);
select throws_ok(
  $$ insert into public.conversation_participants (conversation_id, user_id)
     values (910001, 'b0000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'B cannot add themselves to the A<->C conversation'
);
select throws_ok(
  $$ insert into public.conversations (conversation_type) values ('direct') $$,
  '42501', null,
  'clients cannot create conversations directly'
);
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content)
     values (910002, 'c0000000-0000-0000-0000-00000000000c', 'spoofed sender') $$,
  '42501', null,
  'B cannot post as another user, even in their own conversation'
);
reset role;

select is(
  (select count(*)::int from public.conversation_participants where conversation_id = 910001),
  2,
  'the A<->C conversation still has exactly its two participants'
);

-- ---------------------------------------------------------------- user A
select pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');

select results_eq(
  $$ select content from public.chat_messages where conversation_id = 910001 $$,
  $$ values ('private to A and C'::text) $$,
  'A can read their own conversation'
);
select isnt_empty(
  $$ select 1 from public.conversations where id = 910001 $$,
  'A can read their own conversation row'
);
select lives_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content)
     values (910001, 'a0000000-0000-0000-0000-00000000000a', 'reply') $$,
  'A can post into their own conversation'
);
select is_empty(
  $$ select 1 from public.chat_messages where conversation_id = 910002 $$,
  'A cannot read the B<->C conversation'
);
reset role;

select * from finish();
rollback;
