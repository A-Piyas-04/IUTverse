import "server-only";
import { ensureSupabaseAdmin } from "../utils/supabaseData";

export const getSecurityContext = async (userId: string) => {
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
    membershipStatus: (membership?.status as string | undefined) || "missing",
    membershipSource: (membership?.source as string | undefined) || null,
    role: (roleRow?.role as string | undefined) || "user",
    displayName: (profile?.display_name as string | undefined) || null,
  };
};

export const setUserRole = async ({
  actorId,
  targetUserId,
  role,
  reason,
}: {
  actorId: string;
  targetUserId: string;
  role: string;
  reason: string;
}) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("admin_set_user_role", {
    target_user_id: targetUserId,
    new_role: role,
    actor_user_id: actorId,
    reason,
  });
  if (error) throw error;
  return data;
};

export const discloseAnonymousPostAuthor = async ({
  actorId,
  postId,
  reportId,
  justification,
}: {
  actorId: string;
  postId: number;
  reportId: number;
  justification: string;
}) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("disclose_anonymous_post_author", {
    target_post_id: postId,
    target_report_id: reportId,
    actor_user_id: actorId,
    reason: justification,
  });
  if (error) throw error;
  return (data?.[0] as { user_id: string; display_name: string; handle: string } | undefined) || null;
};

// Locks the report, checks the actor is neither the reporter nor the content
// author, applies one fixed decision and audits it, all in one transaction.
export const moderateReport = async ({ actorId, reportId, decision }: { actorId: string; reportId: number; decision: string }) => {
  const { data, error } = await ensureSupabaseAdmin().rpc("moderate_report", {
    target_report_id: reportId,
    actor_user_id: actorId,
    decision,
  });
  if (error) throw error;
  return data;
};
