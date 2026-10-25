-- Messaging (202610240001): reactions are private to the conversation, only
-- the API writes receipts, edits, media and reactions, and a reaction change
-- touches its message so Realtime reports it.
begin;
\ir helpers/test-users.psql

select plan(13);

select pg_temp.create_member('a2000000-0000-0000-0000-00000000000a', 'chat.a@iut-dhaka.edu');
select pg_temp.create_member('b2000000-0000-0000-0000-00000000000b', 'chat.b@iut-dhaka.edu');
select pg_temp.create_member('c2000000-0000-0000-0000-00000000000c', 'chat.c@iut-dhaka.edu');

insert into public.conversations (id, conversation_type, direct_key)
values (990201, 'direct', 'a2000000-0000-0000-0000-00000000000a:b2000000-0000-0000-0000-00000000000b');
insert into public.conversation_participants (conversation_id, user_id) values
  (990201, 'a2000000-0000-0000-0000-00000000000a'),
  (990201, 'b2000000-0000-0000-0000-00000000000b');
insert into public.chat_messages (id, conversation_id, sender_id, content)
values (990201, 990201, 'a2000000-0000-0000-0000-00000000000a', 'hello');

-- Written by the API (service role).
insert into public.chat_message_reactions (message_id, conversation_id, user_id, emoji)
values (990201, 990201, 'b2000000-0000-0000-0000-00000000000b', '😂');

select isnt(
  (select reactions_changed_at from public.chat_messages where id = 990201), null,
  'a new reaction touches its message, which Realtime then reports');
select is(
  (select kind from public.chat_messages where id = 990201), 'text',
  'messages are text unless the API says otherwise');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, kind) values (990201, 'a2000000-0000-0000-0000-00000000000a', 'x', 'sticker') $$,
  '23514', null, 'unknown message kinds are refused');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, attachment_waveform) values (990201, 'a2000000-0000-0000-0000-00000000000a', 'x', array_fill(1::smallint, array[65])) $$,
  '23514', null, 'waveforms are capped at 64 bars');

select ok(
  (select file_size_limit = 50 * 1024 * 1024 and allowed_mime_types @> array['video/mp4', 'video/quicktime', 'audio/webm', 'audio/mp4', 'image/jpeg', 'application/pdf']
   from storage.buckets where id = 'chat-attachments'),
  'the chat bucket takes photos, PDFs, videos up to 50 MB and voice messages');

-- As the other participant.
select pg_temp.act_as('b2000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.chat_message_reactions where message_id = 990201), 1, 'participants see the reactions in their chat');
select throws_ok(
  $$ insert into public.chat_message_reactions (message_id, conversation_id, user_id, emoji) values (990201, 990201, 'b2000000-0000-0000-0000-00000000000b', '👍') $$,
  '42501', null, 'clients cannot write reactions directly');
select throws_ok(
  $$ update public.chat_messages set read_at = now(), delivered_at = now() where id = 990201 $$,
  '42501', null, 'clients cannot set receipts themselves');
select throws_ok(
  $$ update public.chat_messages set content = 'changed', edited_at = now() where id = 990201 $$,
  '42501', null, 'clients cannot edit messages directly');
select throws_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content, gif_url) values (990201, 'b2000000-0000-0000-0000-00000000000b', '', 'https://evil.example/x.gif') $$,
  '42501', null, 'clients cannot attach GIF links (the API checks where they point)');
select lives_ok(
  $$ insert into public.chat_messages (conversation_id, sender_id, content) values (990201, 'b2000000-0000-0000-0000-00000000000b', 'still fine') $$,
  'clients can still send a plain text message to their own chat');
reset role;

-- As someone outside the conversation.
select pg_temp.act_as('c2000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.chat_message_reactions where message_id = 990201), 0, 'outsiders see no reactions');
reset role;

-- Anonymous visitors have no access at all.
set local role anon;
select throws_ok($$ select count(*) from public.chat_message_reactions $$, '42501', null, 'anonymous visitors cannot read reactions');
reset role;

select * from finish();
rollback;
