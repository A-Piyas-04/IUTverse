-- Regression lint over the final policy state (after every migration).
-- Postgres deparses each column with the relation it binds to, so an
-- unqualified outer column that silently bound to the sub-select's table shows
-- up here as `alias.col = alias.other`.
begin;
select plan(3);

select is(
  (select array_agg(schemaname || '.' || tablename || ': ' || policyname order by 1)
   from pg_policies
   where coalesce(qual, '') || ' ' || coalesce(with_check, '') ~ '(\m\w+)\.\w+ = \1\.\w+\M'),
  null,
  'no policy compares two columns of the same sub-select relation'
);

select is(
  (select array_agg(schemaname || '.' || tablename || ': ' || policyname order by 1)
   from pg_policies
   where coalesce(qual, '') || coalesce(with_check, '') ilike '%exists%'
     and coalesce(qual, '') || ' ' || coalesce(with_check, '') !~ ('\m' || tablename || '\.')),
  null,
  'every EXISTS sub-select in a policy references the row being checked'
);

-- A permissive write policy is only reachable if the client also holds the
-- privilege. The single intended path is the column-limited chat insert.
select is(
  (select array_agg(p.schemaname || '.' || p.tablename || ': ' || p.policyname order by 1)
   from pg_policies p
   where p.permissive = 'PERMISSIVE'
     and p.roles && array['authenticated', 'anon', 'public']::name[]
     and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
     and not (p.schemaname = 'public' and p.tablename = 'chat_messages' and p.cmd = 'INSERT')
     and (
       (p.cmd in ('INSERT', 'ALL') and has_any_column_privilege('authenticated', format('%I.%I', p.schemaname, p.tablename), 'INSERT'))
       or (p.cmd in ('UPDATE', 'ALL') and has_any_column_privilege('authenticated', format('%I.%I', p.schemaname, p.tablename), 'UPDATE'))
       or (p.cmd in ('DELETE', 'ALL') and has_table_privilege('authenticated', format('%I.%I', p.schemaname, p.tablename), 'DELETE'))
     )),
  null,
  'no client write policy is reachable except the chat message insert'
);

select * from finish();
rollback;
