const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("critical security migration protects roles, membership, profiles and audits", () => {
  const sql = read("supabase/migrations/202607030001_critical_security_remediation.sql");
  for (const table of ["memberships", "user_roles", "profile_private", "security_audit_events"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
  }
  assert.match(sql, /create policy active_members_only[\s\S]*as restrictive/);
  assert.match(sql, /insert into public\.user_roles \(user_id, role\)[\s\S]*'user'/);
  assert.match(sql, /prevent_audit_mutation/);
});

test("direct profile and anonymous post reads are revoked", () => {
  const sql = read("supabase/migrations/202607030001_critical_security_remediation.sql");
  assert.match(sql, /revoke all on public\.profiles from anon, authenticated/);
  assert.match(sql, /revoke all on public\.posts from anon, authenticated/);
  assert.match(sql, /alter publication supabase_realtime drop table public\.posts/);
});

test("IUT domain is enforced by a configured before-user-created hook", () => {
  const sql = read("supabase/migrations/202607030001_critical_security_remediation.sql");
  const config = read("supabase/config.toml");
  assert.match(sql, /hook_restrict_iut_signup/);
  assert.match(sql, /@iut-dhaka\[\.\]edu\$/);
  assert.match(sql, /to supabase_auth_admin/);
  assert.match(config, /\[auth\.hook\.before_user_created\]/);
  assert.match(config, /pg-functions:\/\/postgres\/public\/hook_restrict_iut_signup/);
});

test("runtime authorization uses protected security context", () => {
  const auth = read("src/middleware/auth.js");
  const clientAuth = read("../client-v2/src/features/auth/AuthProvider.tsx");
  assert.match(auth, /securityService\.getSecurityContext/);
  assert.match(auth, /membershipStatus !== "active"/);
  assert.doesNotMatch(auth, /jsonwebtoken|jwt\.verify/);
  assert.doesNotMatch(auth, /select\(['"]id, display_name, role/);
  assert.match(clientAuth, /apiUrl\("\/auth\/me"\)/);
  assert.doesNotMatch(clientAuth, /user_metadata\?\.role/);
});

test("anonymous post and comment DTOs redact identity", () => {
  const posts = read("src/controllers/postController.js");
  const comments = read("src/controllers/commentController.js");
  assert.match(posts, /userId: anonymous \? null : post\.author_id/);
  assert.match(posts, /user: anonymous \? null : mapProfile/);
  assert.match(comments, /userId: comment\.is_anonymous \? null : comment\.author_id/);
  assert.match(comments, /user: comment\.is_anonymous \? null : mapProfile/);
});

test("privileged operations use audited database functions", () => {
  const sql = read("supabase/migrations/202607030001_critical_security_remediation.sql");
  const routes = read("src/routes/securityRoutes.js");
  assert.match(sql, /admin_set_user_role/);
  assert.match(sql, /cannot remove the final active administrator/);
  assert.match(sql, /disclose_anonymous_post_author/);
  assert.match(sql, /matching unresolved report is required/);
  assert.match(routes, /requireRole\("admin", "mod"\)/);
});

test("profile writes omit roles and server-managed badges", () => {
  const users = read("src/services/userService.js");
  assert.doesNotMatch(users, /badges:\s*"badges"/);
  assert.doesNotMatch(users, /role:\s*"role"/);
  assert.match(users, /profile_private/);
});

test("profile reference data is normalized and protected", () => {
  const sql = read("supabase/migrations/202607040001_profile_reference_data.sql");
  for (const table of ["programs", "residence_halls", "hall_rooms"]) {
    assert.match(sql, new RegExp("create table if not exists public\\." + table));
    assert.match(sql, new RegExp("revoke all on public\\." + table + " from anon, authenticated"));
  }
  assert.match(sql, /Computer Science and Engineering \(CSE\)'[\s\S]*'SWE'/);
  assert.match(sql, /Mechanical and Production Engineering \(MPE\)'[\s\S]*'IPE'/);
  const correction = read("supabase/migrations/202607040002_department_residency_correction.sql");
  assert.match(correction, /delete from public\.departments where id = short_id/);
  assert.match(correction, /generate_series\(1, 5\)[\s\S]*generate_series\(1, 30\)/);
  assert.match(correction, /generate_series\(4, 5\)[\s\S]*generate_series\(1, 17\)/);
  const service = read("src/services/userService.js");
  assert.match(service, /Selected program does not belong to the selected department/);
  assert.match(service, /Selected room does not belong to the selected hall/);
  assert.doesNotMatch(service, /currentProgram: "current_program"/);
});
