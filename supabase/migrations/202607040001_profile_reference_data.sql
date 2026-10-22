-- Normalize profile choices so clients cannot persist arbitrary departments,
-- programs, halls, or rooms. Existing hall/room text values are preserved.

insert into public.departments (name) values
  ('Computer Science and Engineering (CSE)'),
  ('Mechanical and Production Engineering (MPE)'),
  ('Electrical and Electronic Engineering (EEE)'),
  ('Civil and Environmental Engineering (CEE)'),
  ('Technical and Vocational Education (TVE)')
on conflict (name) do nothing;

create table if not exists public.programs (
  id bigserial primary key,
  department_id bigint not null references public.departments(id) on delete restrict,
  code text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (department_id, code),
  unique (department_id, name)
);

insert into public.programs (department_id, code, name)
select d.id, values_to_insert.code, values_to_insert.name
from (values
  ('Computer Science and Engineering (CSE)', 'CSE', 'Computer Science and Engineering'),
  ('Computer Science and Engineering (CSE)', 'SWE', 'Software Engineering'),
  ('Mechanical and Production Engineering (MPE)', 'MPE', 'Mechanical and Production Engineering'),
  ('Mechanical and Production Engineering (MPE)', 'IPE', 'Industrial and Production Engineering'),
  ('Electrical and Electronic Engineering (EEE)', 'EEE', 'Electrical and Electronic Engineering'),
  ('Civil and Environmental Engineering (CEE)', 'CEE', 'Civil and Environmental Engineering'),
  ('Technical and Vocational Education (TVE)', 'TVE', 'Technical and Vocational Education')
) as values_to_insert(department_name, code, name)
join public.departments d on d.name = values_to_insert.department_name
on conflict (department_id, code) do update set name = excluded.name, active = true;

create table if not exists public.residence_halls (
  id bigserial primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- These are the choices previously present in the application. Administrators
-- can add or deactivate halls without deploying frontend code.
insert into public.residence_halls (name) values ('North'), ('South'), ('Utility')
on conflict (name) do nothing;

-- Preserve any additional hall names already stored in profiles.
insert into public.residence_halls (name)
select distinct trim(current_hall)
from public.profile_private
where nullif(trim(current_hall), '') is not null
on conflict (name) do nothing;

create table if not exists public.hall_rooms (
  id bigserial primary key,
  hall_id bigint not null references public.residence_halls(id) on delete cascade,
  room_number text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hall_id, room_number)
);

-- Existing room numbers become the initial authoritative room inventory. Add
-- the remaining valid rooms to hall_rooms before enabling profile editing.
insert into public.hall_rooms (hall_id, room_number)
select distinct h.id, trim(pp.current_room)
from public.profile_private pp
join public.residence_halls h on h.name = trim(pp.current_hall)
where nullif(trim(pp.current_room), '') is not null
on conflict (hall_id, room_number) do nothing;

alter table public.profile_private add column if not exists program_id bigint references public.programs(id) on delete set null;
alter table public.profile_private add column if not exists hall_id bigint references public.residence_halls(id) on delete set null;
alter table public.profile_private add column if not exists room_id bigint references public.hall_rooms(id) on delete set null;

update public.profile_private pp set program_id = p.id
from public.programs p
where pp.program_id is null
  and lower(trim(pp.current_program)) in (lower(p.code), lower(p.name));

update public.profile_private pp set hall_id = h.id
from public.residence_halls h
where pp.hall_id is null and lower(trim(pp.current_hall)) = lower(h.name);

update public.profile_private pp set room_id = r.id
from public.hall_rooms r
where pp.room_id is null and pp.hall_id = r.hall_id
  and lower(trim(pp.current_room)) = lower(r.room_number);

create index if not exists programs_department_idx on public.programs (department_id) where active;
create index if not exists hall_rooms_hall_idx on public.hall_rooms (hall_id) where active;

alter table public.programs enable row level security;
alter table public.residence_halls enable row level security;
alter table public.hall_rooms enable row level security;
revoke all on public.programs from anon, authenticated;
revoke all on public.residence_halls from anon, authenticated;
revoke all on public.hall_rooms from anon, authenticated;

comment on table public.hall_rooms is 'Authoritative room inventory; populate valid rooms through controlled administration.';
