require("./lib/loadEnv").loadEnv();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const parseList = (value) => [...new Set(String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
const adminEmails = parseList(process.env.BOOTSTRAP_ADMIN_EMAILS);
const moderatorEmails = parseList(process.env.BOOTSTRAP_MODERATOR_EMAILS);

if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!adminEmails.length) throw new Error("BOOTSTRAP_ADMIN_EMAILS must contain at least one approved administrator");
const overlap = adminEmails.filter((email) => moderatorEmails.includes(email));
if (overlap.length) throw new Error(`Emails cannot be both admin and mod: ${overlap.join(", ")}`);

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const listAllUsers = async () => {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
};

const run = async () => {
  const users = await listAllUsers();
  const byEmail = new Map(users.map((user) => [String(user.email || "").toLowerCase(), user]));
  const assignments = [
    ...adminEmails.map((email) => ({ email, role: "admin" })),
    ...moderatorEmails.map((email) => ({ email, role: "mod" })),
  ];
  const missing = assignments.filter(({ email }) => !byEmail.get(email)?.email_confirmed_at);
  if (missing.length) throw new Error(`Approved confirmed accounts not found: ${missing.map(({ email }) => email).join(", ")}`);

  for (const assignment of assignments) {
    const user = byEmail.get(assignment.email);
    const { error: roleError } = await db.from("user_roles").update({
      role: assignment.role,
      granted_by: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).select("user_id").single();
    if (roleError) throw roleError;
    const { error: auditError } = await db.from("security_audit_events").insert({
      actor_id: null,
      action: "user.role_bootstrapped",
      target_type: "user",
      target_id: user.id,
      justification: "Deployment allowlist bootstrap",
      metadata: { role: assignment.role, email: assignment.email },
    });
    if (auditError) throw auditError;
  }
  console.log(`Bootstrapped ${adminEmails.length} admin(s) and ${moderatorEmails.length} moderator(s).`);
};

run().catch((error) => {
  console.error(`Security role bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
