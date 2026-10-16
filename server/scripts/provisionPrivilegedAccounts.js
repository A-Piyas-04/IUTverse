const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const inputPath = process.env.PRIVILEGED_ACCOUNTS_FILE
  ? path.resolve(process.cwd(), process.env.PRIVILEGED_ACCOUNTS_FILE)
  : path.join(__dirname, "privileged-accounts.local.json");

if (!url || !key)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!fs.existsSync(inputPath))
  throw new Error(`Provisioning file not found: ${inputPath}`);

const accounts = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(accounts) || !accounts.length)
  throw new Error("Provisioning file must contain a non-empty JSON array");
if (!accounts.some(({ role }) => role === "admin"))
  throw new Error("At least one administrator is required");

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const allowedKeys = new Set([
  "email",
  "password",
  "role",
  "displayName",
  "departmentId",
  "batch",
  "studentId",
  "bio",
  "interests",
  "collegeName",
  "schoolName",
  "hometown",
  "currentProgram",
  "currentYear",
  "currentSemester",
  "currentHall",
  "currentResidence",
  "currentRoom",
  "currentBed",
]);

const validate = (account, index) => {
  const unknown = Object.keys(account).filter(
    (keyName) => !allowedKeys.has(keyName),
  );
  if (unknown.length)
    throw new Error(
      `Account ${index + 1} has unsupported fields: ${unknown.join(", ")}`,
    );
  account.email = String(account.email || "")
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@iut-dhaka\.edu$/i.test(account.email))
    throw new Error(
      `Account ${index + 1} must use an exact @iut-dhaka.edu address`,
    );
  if (!["admin", "mod"].includes(account.role))
    throw new Error(`Account ${index + 1} role must be admin or mod`);
  if (String(account.password || "").length < 12)
    throw new Error(
      `Account ${index + 1} password must contain at least 12 characters`,
    );
  if (!String(account.displayName || "").trim())
    throw new Error(`Account ${index + 1} displayName is required`);
  if (account.studentId != null && !String(account.studentId).trim())
    throw new Error(`Account ${index + 1} studentId cannot be blank`);
};
accounts.forEach(validate);
if (new Set(accounts.map(({ email }) => email)).size !== accounts.length)
  throw new Error("Provisioning emails must be unique");
const studentIds = accounts
  .map(({ studentId }) => studentId && String(studentId).trim())
  .filter(Boolean);
if (new Set(studentIds).size !== studentIds.length)
  throw new Error("Student IDs must be unique");

const upsert = async (table, values, onConflict) => {
  const { error } = await db.from(table).upsert(values, { onConflict });
  if (error) throw error;
};

const findUserByEmail = async (email) => {
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
};

const provision = async (account) => {
  let createdUser = false;
  let user;
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { display_name: account.displayName },
  });

  if (!createError) {
    user = created.user;
    createdUser = true;
  } else if (
    /already.*(registered|exists)|duplicate/i.test(createError.message)
  ) {
    user = await findUserByEmail(account.email);
    if (!user)
      throw new Error(`Existing Auth user ${account.email} could not be found`);
    const { data: updated, error: updateError } =
      await db.auth.admin.updateUserById(user.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          display_name: account.displayName,
        },
      });
    if (updateError) throw updateError;
    user = updated.user;
  } else {
    throw createError;
  }

  try {
    await upsert(
      "profiles",
      {
        id: user.id,
        display_name: account.displayName.trim(),
        department_id: account.departmentId ?? null,
        batch: account.batch ?? null,
        bio: account.bio ?? null,
        interests: account.interests ?? [],
      },
      "id",
    );
    await upsert(
      "profile_private",
      {
        user_id: user.id,
        student_id: account.studentId ? String(account.studentId).trim() : null,
        college_name: account.collegeName ?? null,
        school_name: account.schoolName ?? null,
        hometown: account.hometown ?? null,
        current_program: account.currentProgram ?? null,
        current_year: account.currentYear ?? null,
        current_semester: account.currentSemester ?? null,
        current_hall: account.currentHall ?? null,
        current_residence: account.currentResidence ?? null,
        current_room: account.currentRoom ?? null,
        current_bed: account.currentBed ?? null,
      },
      "user_id",
    );
    await upsert(
      "memberships",
      { user_id: user.id, status: "active", source: "admin", granted_by: null },
      "user_id",
    );
    await upsert(
      "user_roles",
      { user_id: user.id, role: account.role, granted_by: null },
      "user_id",
    );
    const { error: auditError } = await db
      .from("security_audit_events")
      .insert({
        actor_id: null,
        action: "user.privileged_account_provisioned",
        target_type: "user",
        target_id: user.id,
        justification: "Initial privileged-account provisioning",
        metadata: {
          email: account.email,
          role: account.role,
          createdAuthUser: createdUser,
        },
      });
    if (auditError) throw auditError;
    console.log(
      `${createdUser ? "Created" : "Updated"} ${account.role}: ${account.email}`,
    );
  } catch (error) {
    if (createdUser) await db.auth.admin.deleteUser(user.id).catch(() => {});
    throw new Error(`Failed provisioning ${account.email}: ${error.message}`);
  }
};

(async () => {
  for (const account of accounts) await provision(account);
  console.log(
    `Provisioned ${accounts.length} privileged account(s). Delete the local JSON file now.`,
  );
})().catch((error) => {
  console.error(`Privileged-account provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
