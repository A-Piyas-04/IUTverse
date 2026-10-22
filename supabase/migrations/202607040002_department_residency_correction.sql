-- Correct abbreviation-only department duplicates and introduce an explicit,
-- validated residency model.

do $$
declare
  mapping record;
  short_id bigint;
  canonical_id bigint;
  program_row record;
  canonical_program_id bigint;
begin
  for mapping in
    select * from (values
      ('CSE', 'Computer Science and Engineering (CSE)'),
      ('MPE', 'Mechanical and Production Engineering (MPE)'),
      ('EEE', 'Electrical and Electronic Engineering (EEE)'),
      ('CEE', 'Civil and Environmental Engineering (CEE)'),
      ('TVE', 'Technical and Vocational Education (TVE)')
    ) as values_to_map(short_name, canonical_name)
  loop
    select id into short_id from public.departments where name = mapping.short_name;
    select id into canonical_id from public.departments where name = mapping.canonical_name;
    if canonical_id is null then
      insert into public.departments (name) values (mapping.canonical_name) returning id into canonical_id;
    end if;
    if short_id is null or short_id = canonical_id then continue; end if;

    update public.profiles set department_id = canonical_id where department_id = short_id;
    update public.academic_resources set department_id = canonical_id where department_id = short_id;
    update public.posts set audience_department_id = canonical_id where audience_department_id = short_id;

    for program_row in select id, code from public.programs where department_id = short_id
    loop
      select id into canonical_program_id
      from public.programs
      where department_id = canonical_id and code = program_row.code;
      if canonical_program_id is not null then
        update public.profile_private set program_id = canonical_program_id where program_id = program_row.id;
        delete from public.programs where id = program_row.id;
      else
        update public.programs set department_id = canonical_id where id = program_row.id;
      end if;
    end loop;
    delete from public.departments where id = short_id;
  end loop;
end $$;

-- Ensure the requested program-to-department mapping exists on canonical rows.
insert into public.programs (department_id, code, name)
select d.id, seed.code, seed.program_name
from (values
  ('Computer Science and Engineering (CSE)', 'CSE', 'Computer Science and Engineering'),
  ('Computer Science and Engineering (CSE)', 'SWE', 'Software Engineering'),
  ('Mechanical and Production Engineering (MPE)', 'MPE', 'Mechanical and Production Engineering'),
  ('Mechanical and Production Engineering (MPE)', 'IPE', 'Industrial and Production Engineering'),
  ('Electrical and Electronic Engineering (EEE)', 'EEE', 'Electrical and Electronic Engineering'),
  ('Civil and Environmental Engineering (CEE)', 'CEE', 'Civil and Environmental Engineering'),
  ('Technical and Vocational Education (TVE)', 'TVE', 'Technical and Vocational Education')
) as seed(department_name, code, program_name)
join public.departments d on d.name = seed.department_name
on conflict (department_id, code) do update
set name = excluded.name, active = true;

alter table public.profile_private
  add column if not exists residency_type text,
  add column if not exists resident_gender text;

do $$ begin
  alter table public.profile_private add constraint profile_private_residency_type_check
    check (residency_type is null or residency_type in ('resident', 'non_resident'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profile_private add constraint profile_private_resident_gender_check
    check (resident_gender is null or resident_gender in ('male', 'female'));
exception when duplicate_object then null; end $$;

-- Each hall has its own room rows, so North 502 and South 502 are distinct.
insert into public.hall_rooms (hall_id, room_number)
select h.id, (floor_number * 100 + room_number)::text
from public.residence_halls h
cross join generate_series(1, 5) floor_number
cross join generate_series(1, 30) room_number
where h.name in ('North', 'South')
on conflict (hall_id, room_number) do update set active = true;

insert into public.hall_rooms (hall_id, room_number)
select h.id, (floor_number * 100 + room_number)::text
from public.residence_halls h
cross join generate_series(4, 5) floor_number
cross join generate_series(1, 17) room_number
where h.name = 'Utility'
on conflict (hall_id, room_number) do update set active = true;

-- Remove invalid inventory rows for the three defined male halls. Referencing
-- profiles retain their legacy text but room_id becomes null through ON DELETE.
delete from public.hall_rooms r
using public.residence_halls h
where r.hall_id = h.id
  and h.name in ('North', 'South', 'Utility')
  and not (
    (h.name in ('North', 'South') and r.room_number ~ '^[1-5][0-9]{2}$'
      and substring(r.room_number from 2)::integer between 1 and 30)
    or
    (h.name = 'Utility' and r.room_number ~ '^[45][0-9]{2}$'
      and substring(r.room_number from 2)::integer between 1 and 17)
  );

-- Infer explicit residency for valid existing hall/room selections.
update public.profile_private pp
set residency_type = 'resident',
    resident_gender = 'male',
    current_residence = h.name || ' ' || r.room_number
from public.residence_halls h, public.hall_rooms r
where pp.hall_id = h.id and pp.room_id = r.id and r.hall_id = h.id
  and h.name in ('North', 'South', 'Utility')
  and pp.residency_type is null;
