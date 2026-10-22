-- H-2 / H-3 / M-3: moderation decisions and identity disclosure.
-- Functions are called as the API would call them (service role); the
-- authorization checks live inside the functions.
begin;
\ir helpers/test-users.psql

select plan(38);

select pg_temp.create_member('a2000000-0000-0000-0000-00000000000a', 'author.a@iut-dhaka.edu');
select pg_temp.create_member('e2000000-0000-0000-0000-00000000000e', 'reporter.r@iut-dhaka.edu');
select pg_temp.create_member('f1000000-0000-0000-0000-0000000000f1', 'mod.one@iut-dhaka.edu', 'mod');
select pg_temp.create_member('f2000000-0000-0000-0000-0000000000f2', 'mod.two@iut-dhaka.edu', 'mod');
select pg_temp.create_member('f3000000-0000-0000-0000-0000000000f3', 'admin.three@iut-dhaka.edu', 'admin');
select pg_temp.create_member('f4000000-0000-0000-0000-0000000000f4', 'norole.four@iut-dhaka.edu');
delete from public.user_roles where user_id = 'f4000000-0000-0000-0000-0000000000f4';

insert into public.posts (id, author_id, content, is_anonymous, status) values
  (920001, 'a2000000-0000-0000-0000-00000000000a', 'anonymous post by A', true, 'active'),
  (920002, 'f1000000-0000-0000-0000-0000000000f1', 'post by mod one', false, 'archived');
insert into public.jobs (id, title, type, description, posted_by_id, status) values
  (920001, 'deleted job', 'Internship', 'x', 'a2000000-0000-0000-0000-00000000000a', 'deleted'),
  (920002, 'active job', 'Internship', 'x', 'a2000000-0000-0000-0000-00000000000a', 'active'),
  (920003, 'archived job', 'Internship', 'x', 'a2000000-0000-0000-0000-00000000000a', 'archived'),
  (920004, 'job reported by a moderator', 'Internship', 'x', 'a2000000-0000-0000-0000-00000000000a', 'active');

insert into public.content_reports (id, reporter_id, entity_kind, entity_id, reason) values
  (920001, 'f1000000-0000-0000-0000-0000000000f1', 'post', 920001, 'self-filed by mod one'),
  (920002, 'e2000000-0000-0000-0000-00000000000e', 'job', 920001, 'report on deleted job'),
  (920003, 'e2000000-0000-0000-0000-00000000000e', 'post', 920002, 'report on mod one''s post'),
  (920004, 'e2000000-0000-0000-0000-00000000000e', 'job', 920002, 'report on active job'),
  (920005, 'e2000000-0000-0000-0000-00000000000e', 'job', 920002, 'second report on active job'),
  (920006, 'e2000000-0000-0000-0000-00000000000e', 'post', 920001, 'member report on anonymous post'),
  (920007, 'e2000000-0000-0000-0000-00000000000e', 'job', 920003, 'report on archived job'),
  (920008, 'f1000000-0000-0000-0000-0000000000f1', 'job', 920004, 'filed by mod one');

-- ------------------------------------------------------- identity disclosure
select throws_ok(
  $$ select * from public.disclose_anonymous_post_author(920001, 920001, 'f1000000-0000-0000-0000-0000000000f1', 'need to identify the author') $$,
  '42501', 'moderators cannot act on reports they filed',
  'a moderator cannot disclose using a report they filed themselves'
);
select is(
  (select status::text from public.content_reports where id = 920001), 'pending',
  'the rejected self-report is left untouched'
);
select results_eq(
  $$ select user_id from public.disclose_anonymous_post_author(920001, 920001, 'f2000000-0000-0000-0000-0000000000f2', 'need to identify the author') $$,
  $$ values ('a2000000-0000-0000-0000-00000000000a'::uuid) $$,
  'a different moderator can disclose using the pending report'
);
select results_eq(
  $$ select status::text, review_action, reviewed_by_id from public.content_reports where id = 920001 $$,
  $$ values ('reviewed'::text, 'identity_disclosed'::text, 'f2000000-0000-0000-0000-0000000000f2'::uuid) $$,
  'disclosure consumes the report'
);
select throws_ok(
  $$ select * from public.disclose_anonymous_post_author(920001, 920001, 'f2000000-0000-0000-0000-0000000000f2', 'second look at the author') $$,
  'P0001', 'a matching unresolved report is required',
  'a used disclosure report cannot be reused for a second disclosure'
);
select throws_ok(
  $$ select * from public.disclose_anonymous_post_author(920001, 920001, 'f3000000-0000-0000-0000-0000000000f3', 'second look at the author') $$,
  'P0001', 'a matching unresolved report is required',
  'nor by another moderator'
);
select is(
  (select count(*)::int from public.security_audit_events
   where action = 'anonymous_post.identity_disclosed' and target_id = '920001'),
  1,
  'exactly one disclosure was audited'
);
select throws_ok(
  $$ select * from public.disclose_anonymous_post_author(920001, 920006, 'f4000000-0000-0000-0000-0000000000f4', 'need to identify the author') $$,
  '42501', 'moderator access required',
  'disclosure fails closed for an actor with no role row'
);
select throws_ok(
  $$ select * from public.disclose_anonymous_post_author(920001, 920006, 'e2000000-0000-0000-0000-00000000000e', 'need to identify the author') $$,
  '42501', 'moderator access required',
  'a regular member cannot disclose'
);

-- ------------------------------------------------------- moderate_report
select throws_ok(
  $$ select public.moderate_report(920008, 'f1000000-0000-0000-0000-0000000000f1', 'archive') $$,
  '42501', 'moderators cannot decide reports they filed',
  'a moderator cannot decide a report they filed'
);
select is(
  (select status::text from public.jobs where id = 920004), 'active',
  'the self-reported content is unchanged'
);
select throws_ok(
  $$ select public.moderate_report(920001, 'f3000000-0000-0000-0000-0000000000f3', 'dismiss') $$,
  '55000', 'report is already resolved',
  're-deciding an already-closed report is rejected'
);
select throws_ok(
  $$ select public.moderate_report(920002, 'f1000000-0000-0000-0000-0000000000f1', 'approve') $$,
  '55000', 'deleted content cannot be restored or archived',
  'approving deleted content is rejected'
);
select throws_ok(
  $$ select public.moderate_report(920002, 'f1000000-0000-0000-0000-0000000000f1', 'archive') $$,
  '55000', 'deleted content cannot be restored or archived',
  'archiving deleted content is rejected'
);
select is(
  (select status::text from public.jobs where id = 920001), 'deleted',
  'the deleted job stays deleted'
);
select lives_ok(
  $$ select public.moderate_report(920002, 'f1000000-0000-0000-0000-0000000000f1', 'dismiss') $$,
  'a report on deleted content can still be dismissed'
);
select is(
  (select status::text from public.jobs where id = 920001), 'deleted',
  'dismissing leaves the deleted job deleted'
);
select throws_ok(
  $$ select public.moderate_report(920003, 'f1000000-0000-0000-0000-0000000000f1', 'approve') $$,
  '42501', 'moderators cannot decide reports on their own content',
  'a moderator cannot restore their own archived content'
);
select is(
  (select status::text from public.posts where id = 920002), 'archived',
  'their post stays archived'
);
select throws_ok(
  $$ select public.moderate_report(920004, 'e2000000-0000-0000-0000-00000000000e', 'archive') $$,
  '42501', 'moderator access required',
  'a regular member cannot moderate'
);
select throws_ok(
  $$ select public.moderate_report(920004, 'f4000000-0000-0000-0000-0000000000f4', 'archive') $$,
  '42501', 'moderator access required',
  'moderate_report fails closed for an actor with no role row'
);
select throws_ok(
  $$ select public.moderate_report(920004, 'f2000000-0000-0000-0000-0000000000f2', 'delete') $$,
  '22023', 'invalid moderation decision',
  'only approve, archive and dismiss are accepted'
);
select throws_ok(
  $$ select public.moderate_report(999999, 'f2000000-0000-0000-0000-0000000000f2', 'archive') $$,
  'P0002', 'report not found',
  'unknown reports are rejected'
);

select results_eq(
  $$ select status::text, review_action, reviewed_by_id
     from public.moderate_report(920004, 'f2000000-0000-0000-0000-0000000000f2', 'archive') $$,
  $$ values ('reviewed'::text, 'archive'::text, 'f2000000-0000-0000-0000-0000000000f2'::uuid) $$,
  'archive marks the report reviewed with a fixed action'
);
select is(
  (select status::text from public.jobs where id = 920002), 'archived',
  'archive archives the content in the same transaction'
);
select results_eq(
  $$ select metadata->>'decision', metadata->>'previousEntityStatus', metadata->>'newEntityStatus'
     from public.security_audit_events
     where action = 'content_report.decided' and target_id = '920004' $$,
  $$ values ('archive'::text, 'active'::text, 'archived'::text) $$,
  'the decision is audited with before and after states'
);
select results_eq(
  $$ select status::text, review_action from public.moderate_report(920005, 'f3000000-0000-0000-0000-0000000000f3', 'dismiss') $$,
  $$ values ('dismissed'::text, 'dismiss'::text) $$,
  'dismiss marks the report dismissed'
);
select is(
  (select status::text from public.jobs where id = 920002), 'archived',
  'dismiss does not change the content'
);

select results_eq(
  $$ select status::text, review_action from public.moderate_report(920007, 'f2000000-0000-0000-0000-0000000000f2', 'approve') $$,
  $$ values ('reviewed'::text, 'approve'::text) $$,
  'approve marks the report reviewed'
);
select is(
  (select status::text from public.jobs where id = 920003), 'active',
  'approve restores archived content to active'
);

-- ------------------------------------------------------- admin_set_user_role (M-3)
select throws_ok(
  $$ select public.admin_set_user_role('e2000000-0000-0000-0000-00000000000e', 'mod', 'f4000000-0000-0000-0000-0000000000f4', 'promote for testing') $$,
  'P0001', 'administrator access required',
  'role changes fail closed for an actor with no role row'
);
select throws_ok(
  $$ select public.admin_set_user_role('e2000000-0000-0000-0000-00000000000e', 'mod', 'f1000000-0000-0000-0000-0000000000f1', 'promote for testing') $$,
  'P0001', 'administrator access required',
  'moderators cannot change roles'
);

select throws_ok(
  $$ select public.admin_set_user_role('f3000000-0000-0000-0000-0000000000f3', 'user', 'f3000000-0000-0000-0000-0000000000f3', 'stepping down for testing') $$,
  'P0001', 'administrators cannot change their own role',
  'an administrator cannot change their own role'
);
select is(
  (select role::text from public.user_roles where user_id = 'f3000000-0000-0000-0000-0000000000f3'), 'admin',
  'the administrator keeps their role'
);
select is(
  public.admin_set_user_role('e2000000-0000-0000-0000-00000000000e', 'mod', 'f3000000-0000-0000-0000-0000000000f3', 'promote for testing'),
  'mod'::public.app_role,
  'an administrator can change another member''s role'
);
select is(
  (select count(*)::int from public.security_audit_events
   where action = 'user.role_changed' and target_id = 'e2000000-0000-0000-0000-00000000000e'),
  1,
  'the role change is audited'
);

-- ------------------------------------------------------- client access
select ok(
  not has_function_privilege('authenticated', 'public.moderate_report(bigint, uuid, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.moderate_report(bigint, uuid, text)', 'EXECUTE'),
  'clients cannot call moderate_report directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.lock_report_target(public.entity_kind, bigint)', 'EXECUTE'),
  'clients cannot call lock_report_target directly'
);

select * from finish();
rollback;
