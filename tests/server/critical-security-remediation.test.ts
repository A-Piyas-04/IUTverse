// The database half of the security remediation is SQL; these checks keep the
// migrations and the code that depends on them in step.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const criticalMigration = () => read("supabase/migrations/202607030001_critical_security_remediation.sql");

describe("critical security remediation", () => {
  it("protects roles, membership, profiles and audits in the database", () => {
    const sql = criticalMigration();
    for (const table of ["memberships", "user_roles", "profile_private", "security_audit_events"]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${table}`));
      expect(sql).toMatch(new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
    }
    expect(sql).toMatch(/create policy active_members_only[\s\S]*as restrictive/);
    expect(sql).toMatch(/insert into public\.user_roles \(user_id, role\)[\s\S]*'user'/);
    expect(sql).toMatch(/prevent_audit_mutation/);
  });

  it("revokes direct profile and anonymous post reads", () => {
    const sql = criticalMigration();
    expect(sql).toMatch(/revoke all on public\.profiles from anon, authenticated/);
    expect(sql).toMatch(/revoke all on public\.posts from anon, authenticated/);
    expect(sql).toMatch(/alter publication supabase_realtime drop table public\.posts/);
  });

  it("enforces the IUT domain with a configured before-user-created hook", () => {
    const sql = criticalMigration();
    const config = read("supabase/config.toml");
    expect(sql).toMatch(/hook_restrict_iut_signup/);
    expect(sql).toMatch(/@iut-dhaka\[\.\]edu\$/);
    expect(sql).toMatch(/to supabase_auth_admin/);
    expect(config).toMatch(/\[auth\.hook\.before_user_created\]/);
    expect(config).toMatch(/pg-functions:\/\/postgres\/public\/hook_restrict_iut_signup/);
  });

  it("authorizes at runtime from the protected security context, on the server and in the client", () => {
    const auth = read("src/server/middleware/auth.ts");
    const clientAuth = read("src/features/auth/AuthProvider.tsx");
    expect(auth).toMatch(/securityService\.getSecurityContext/);
    expect(auth).toMatch(/membershipStatus !== "active"/);
    expect(auth).not.toMatch(/jsonwebtoken|jwt\.verify/);
    expect(auth).not.toMatch(/select\(['"]id, display_name, role/);
    expect(clientAuth).toMatch(/apiUrl\("\/auth\/me"\)/);
    expect(clientAuth).not.toMatch(/user_metadata\?\.role/);
  });

  it("redacts identity from anonymous post and comment DTOs", () => {
    const posts = read("src/server/controllers/postController.ts");
    const comments = read("src/server/controllers/commentController.ts");
    expect(posts).toMatch(/userId: anonymous \? null : post\.author_id/);
    expect(posts).toMatch(/user: anonymous \? null : mapProfile/);
    expect(comments).toMatch(/userId: comment\.is_anonymous \? null : comment\.author_id/);
    expect(comments).toMatch(/user: comment\.is_anonymous \? null : mapProfile/);
  });

  it("routes privileged operations through audited database functions", () => {
    const sql = criticalMigration();
    expect(sql).toMatch(/admin_set_user_role/);
    expect(sql).toMatch(/cannot remove the final active administrator/);
    expect(sql).toMatch(/disclose_anonymous_post_author/);
    expect(sql).toMatch(/matching unresolved report is required/);
    expect(read("src/app/api/moderation/posts/[postId]/identity-disclosures/route.ts")).toMatch(/requireRole\("admin", "mod"\)/);
    expect(read("src/app/api/admin/users/[userId]/role/route.ts")).toMatch(/requireAdmin/);
  });

  it("keeps roles and server-managed badges out of profile writes", () => {
    const users = read("src/server/services/userService.ts");
    expect(users).not.toMatch(/badges:\s*"badges"/);
    expect(users).not.toMatch(/role:\s*"role"/);
    expect(users).toMatch(/profile_private/);
  });

  it("normalizes and protects profile reference data", () => {
    const sql = read("supabase/migrations/202607040001_profile_reference_data.sql");
    for (const table of ["programs", "residence_halls", "hall_rooms"]) {
      expect(sql).toMatch(new RegExp("create table if not exists public\\." + table));
      expect(sql).toMatch(new RegExp("revoke all on public\\." + table + " from anon, authenticated"));
    }
    expect(sql).toMatch(/Computer Science and Engineering \(CSE\)'[\s\S]*'SWE'/);
    expect(sql).toMatch(/Mechanical and Production Engineering \(MPE\)'[\s\S]*'IPE'/);
    const correction = read("supabase/migrations/202607040002_department_residency_correction.sql");
    expect(correction).toMatch(/delete from public\.departments where id = short_id/);
    expect(correction).toMatch(/generate_series\(1, 5\)[\s\S]*generate_series\(1, 30\)/);
    expect(correction).toMatch(/generate_series\(4, 5\)[\s\S]*generate_series\(1, 17\)/);
    const service = read("src/server/services/userService.ts");
    expect(service).toMatch(/Selected program does not belong to the selected department/);
    expect(service).toMatch(/Selected room does not belong to the selected hall/);
    expect(service).not.toMatch(/currentProgram: "current_program"/);
  });
});
