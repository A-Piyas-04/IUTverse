-- A post's reply count covers visible replies only. Moderators hide a comment by
-- changing its status, which the insert and delete triggers never saw, so counts
-- drifted above what readers could see, and deleting a hidden comment subtracted
-- a reply that was no longer counted.

create or replace function public.increment_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  end if;
  return new;
end;
$$;

create or replace function public.decrement_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return old;
end;
$$;

create or replace function public.sync_post_comment_count_on_status()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  elsif old.status <> 'active' and new.status = 'active' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  end if;
  return new;
end;
$$;

drop trigger if exists post_comment_status_count on public.post_comments;
create trigger post_comment_status_count
  after update of status on public.post_comments
  for each row execute procedure public.sync_post_comment_count_on_status();

-- Correct the counts that have already drifted.
update public.posts p
set comment_count = counted.total
from (
  select posts.id, count(c.id)::int as total
  from public.posts
  left join public.post_comments c on c.post_id = posts.id and c.status = 'active'
  group by posts.id
) counted
where counted.id = p.id
  and p.comment_count <> counted.total;
