-- Sign-ups through Google (or another OAuth provider) carry the person's name as
-- full_name/name, not the display_name the password sign-up form sends. Use it
-- for the new profile instead of falling back to the email's local part.
-- Everything else is unchanged from 202607030001: membership and the 'user' role
-- are still granted only to @iut-dhaka.edu addresses, and hook_restrict_iut_signup
-- refuses every other address before this trigger runs, OAuth included.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.profile_private (user_id) values (new.id)
  on conflict (user_id) do nothing;

  if lower(split_part(new.email, '@', 2)) = 'iut-dhaka.edu' then
    insert into public.memberships (user_id, status, source)
    values (new.id, 'active', 'iut_domain')
    on conflict (user_id) do nothing;

    insert into public.user_roles (user_id, role)
    values (new.id, 'user')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
