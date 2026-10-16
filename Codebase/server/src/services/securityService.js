const { ensureSupabaseAdmin } = require("../utils/supabaseData");

const getSecurityContext = async (userId) => {
  const db = ensureSupabaseAdmin();
  const [{ data: membership, error: membershipError }, { data: roleRow, error: roleError }, { data: profile, error: profileError }] =
    await Promise.all([
      db.from("memberships").select("status, source").eq("user_id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      db.from("profiles").select("id, display_name").eq("id", userId).maybeSingle(),
    ]);

  if (membershipError) throw membershipError;
  if (roleError) throw roleError;
  if (profileError) throw profileError;

  return {
    membershipStatus: membership?.status || "missing",
    membershipSource: membership?.source || null,
    role: roleRow?.role || "user",
    displayName: profile?.display_name || null,
  };
};

const setUserRole = async ({ actorId, targetUserId, role, reason }) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("admin_set_user_role", {
    target_user_id: targetUserId,
    new_role: role,
    actor_user_id: actorId,
    reason,
  });
  if (error) throw error;
  return data;
};

const discloseAnonymousPostAuthor = async ({ actorId, postId, reportId, justification }) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("disclose_anonymous_post_author", {
    target_post_id: postId,
    target_report_id: reportId,
    actor_user_id: actorId,
    reason: justification,
  });
  if (error) throw error;
  return data?.[0] || null;
};

// Locks the report, checks the actor is neither the reporter nor the content
// author, applies one fixed decision and audits it, all in one transaction.
const moderateReport = async ({ actorId, reportId, decision }) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("moderate_report", {
    target_report_id: reportId,
    actor_user_id: actorId,
    decision,
  });
  if (error) throw error;
  return data;
};

module.exports = { discloseAnonymousPostAuthor, getSecurityContext, moderateReport, setUserRole };
