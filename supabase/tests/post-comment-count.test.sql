-- A post's comment_count covers visible replies only (202611060001): it follows
-- moderation in both directions, and deleting a hidden reply changes nothing.
begin;
\ir helpers/test-users.psql

select plan(7);

select pg_temp.create_member('a6000000-0000-0000-0000-00000000000a', 'count.a@iut-dhaka.edu');

insert into public.posts (id, author_id, content) values (990601, 'a6000000-0000-0000-0000-00000000000a', 'counted');
insert into public.post_comments (id, post_id, author_id, content) values
  (990611, 990601, 'a6000000-0000-0000-0000-00000000000a', 'one'),
  (990612, 990601, 'a6000000-0000-0000-0000-00000000000a', 'two');

select is((select comment_count from public.posts where id = 990601), 2, 'a new reply counts');

update public.post_comments set status = 'archived' where id = 990611;
select is((select comment_count from public.posts where id = 990601), 1, 'hiding a reply removes it from the count');

update public.post_comments set status = 'flagged' where id = 990611;
select is((select comment_count from public.posts where id = 990601), 1, 'moving between hidden states changes nothing');

update public.post_comments set content = 'edited' where id = 990612;
select is((select comment_count from public.posts where id = 990601), 1, 'an edit changes nothing');

update public.post_comments set status = 'active' where id = 990611;
select is((select comment_count from public.posts where id = 990601), 2, 'restoring a reply counts it again');

update public.post_comments set status = 'archived' where id = 990611;
delete from public.post_comments where id = 990611;
select is((select comment_count from public.posts where id = 990601), 1, 'deleting a hidden reply subtracts nothing');

delete from public.post_comments where id = 990612;
select is((select comment_count from public.posts where id = 990601), 0, 'deleting a visible reply subtracts it');

select * from finish();
rollback;
