-- Blocking and per-member chat settings (202610240002): a block stops the
-- direct-insert path too, members only see blocks they made, and settings
-- are written by the API only.
begin;
\ir helpers/test-users.psql

select plan(10);

select pg_temp.create_member('a3000000-0000-0000-0000-00000000000a', 'block.a@iut-dhaka.edu');
select pg_temp.create_member('b3000000-0000-0000-0000-00000000000b', 'block.b@iut-dhaka.edu');

insert into public.conversations (id, conversation_type, direct_key)
values (990301, 'direct', 'a3000000-0000-0000-0000-00000000000a:b3000000-0000-0000-0000-00000000000b');
insert into public.conversation_participants (conversation_id, user_id) values
  (990301, 'a3000000-0000-0000-0000-00000000000a'),
  (990301, 'b3000000-0000-0000-0000-00000000000b');

select is(public.chat_is_blocked(990301, 'a3000000-0000-0000-0000-00000000000a'), false, 'no block, no problem');

-- A blocks B (the API does this with the service role).
insert into public.user_blocks (blocker_id, blocked_id) values ('a3000000-0000-0000-0000-00000000000a', 'b3000000-0000-0000-0000-00000000000b');
select is(public.chat_is_blocked(990301, 'b3000000-0000-0000-0000-00000000000b'), true, 'the blocked member is blocked in the chat');
select is(public.chat_is_blocked(990301, 'a3000000-0000-0000-0000-00000000000a'), true, 'and so is the member who blocked, until they unblock');
select throws_ok(
  $$ insert into public.user_blocks (blocker_id, blocked_id) values ('a3000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-00000000000a') $$,
  '23514', null, 'nobody can block themselves');
select throws_ok(
  $$ update public.conversation_participants set nickname = repeat('x', 41) where conversation_id = 990301 $$,
  '23514', null, 'nicknames are at most 40 characters');

select pg_temp.act_as('b3000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content) values (990301, 'b3000000-0000-0000-0000-00000000000b', 'let me in') $$,
  '42501', null, 'a blocked member cannot slip a message in directly');
select is((select count(*)::int from public.user_blocks), 0, 'members cannot see who blocked them');
select throws_ok(
  $$ update public.conversation_participants set muted_until = now(), nickname = 'x' where conversation_id = 990301 $$,
  '42501', null, 'chat settings are only changed through the API');
reset role;

select pg_temp.act_as('a3000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.user_blocks), 1, 'members see the blocks they made');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content) values (990301, 'a3000000-0000-0000-0000-00000000000a', 'hello?') $$,
  '42501', null, 'the member who blocked cannot message either');
reset role;

select * from finish();
rollback;
