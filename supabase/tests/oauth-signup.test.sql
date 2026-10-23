-- OAuth sign-ups: the IUT-only hook applies to them like any other sign-up, and
-- the new profile takes the provider's name.
begin;

select plan(7);

select is(
  public.hook_restrict_iut_signup('{"user":{"email":"someone@gmail.com","app_metadata":{"provider":"google"}}}'),
  '{"error":{"http_code":403,"message":"Only verified IUT email addresses may create an account."}}'::jsonb,
  'a Google account outside @iut-dhaka.edu is refused'
);
select is(
  public.hook_restrict_iut_signup('{"user":{"email":"Student@IUT-Dhaka.edu","app_metadata":{"provider":"google"}}}'),
  '{}'::jsonb,
  'an IUT Google account is allowed, whatever the case of the address'
);

-- What Supabase Auth inserts for a first Google sign-in.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-00000000000c', 'authenticated',
        'authenticated', 'google.user@iut-dhaka.edu', '', now(),
        '{"provider":"google","providers":["google"]}',
        '{"full_name":"Google User","name":"Google User","email":"google.user@iut-dhaka.edu","email_verified":true}',
        now(), now());

select is(
  (select display_name from public.profiles where id = 'c1000000-0000-0000-0000-00000000000c'),
  'Google User', 'the profile uses the name from the provider');
select is(
  (select status::text from public.memberships where user_id = 'c1000000-0000-0000-0000-00000000000c'),
  'active', 'an IUT Google account becomes an active member');
select is(
  (select role::text from public.user_roles where user_id = 'c1000000-0000-0000-0000-00000000000c'),
  'user', 'and gets the plain user role');

-- A password sign-up still prefers the display name typed into the form.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-00000000000c', 'authenticated',
        'authenticated', 'form.user@iut-dhaka.edu', '', now(),
        '{"provider":"email","providers":["email"]}', '{"display_name":"Chosen Name","name":"Other"}', now(), now());
select is(
  (select display_name from public.profiles where id = 'c2000000-0000-0000-0000-00000000000c'),
  'Chosen Name', 'display_name from the sign-up form wins');

-- No name at all (blank metadata) falls back to the email's local part.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-00000000000c', 'authenticated',
        'authenticated', 'no.name@iut-dhaka.edu', '', now(),
        '{"provider":"google","providers":["google"]}', '{"full_name":"  ","name":""}', now(), now());
select is(
  (select display_name from public.profiles where id = 'c3000000-0000-0000-0000-00000000000c'),
  'no.name', 'blank provider names fall back to the email local part');

select * from finish();
rollback;
