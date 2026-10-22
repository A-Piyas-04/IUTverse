import "server-only";
import type { Handler } from "../http/context";
import * as response from "../http/responses";
import logger from "../utils/logger";
import * as securityService from "../services/securityService";
import { positiveInt, requiredText, uuid } from "../utils/validation";

export const updateUserRole: Handler = async (ctx) => {
  try {
    const target = uuid(ctx.params.userId, "User ID");
    if (!target.ok) return response.badRequest(target.error);
    const role = String(ctx.body.role || "").toLowerCase();
    if (!["user", "mod", "admin"].includes(role)) {
      return response.badRequest("Role must be one of: user, mod, admin");
    }
    const reason = requiredText(ctx.body.reason, "Reason", { min: 8, max: 500 });
    if (!reason.ok) return response.badRequest(reason.error);

    const updatedRole = await securityService.setUserRole({
      actorId: ctx.user!.id,
      targetUserId: target.value,
      role,
      reason: reason.value,
    });
    return response.success({ userId: target.value, role: updatedRole }, "Role updated");
  } catch (error: any) {
    logger.error("Role update failed", error);
    if (/administrator|final active|own role|target user/i.test(error.message)) {
      return response.forbidden(error.message);
    }
    return response.serverError("Could not update role", error.message);
  }
};

export const disclosePostIdentity: Handler = async (ctx) => {
  try {
    const postId = positiveInt(ctx.params.postId, "Post ID");
    const reportId = positiveInt(ctx.body.reportId, "Report ID");
    const justification = requiredText(ctx.body.justification, "Justification", { min: 12, max: 1000 });
    if (!postId.ok) return response.badRequest(postId.error);
    if (!reportId.ok) return response.badRequest(reportId.error);
    if (!justification.ok) return response.badRequest(justification.error);
    const identity = await securityService.discloseAnonymousPostAuthor({
      actorId: ctx.user!.id,
      postId: postId.value,
      reportId: reportId.value,
      justification: justification.value,
    });
    if (!identity) return response.notFound("Anonymous post identity not found");
    return response.success({
      userId: identity.user_id,
      displayName: identity.display_name,
      handle: identity.handle,
    });
  } catch (error: any) {
    logger.error("Anonymous identity disclosure failed", error);
    if (/moderator access|cannot act on reports/i.test(error.message)) return response.forbidden(error.message);
    if (/matching unresolved|anonymous post not found/i.test(error.message)) return response.badRequest(error.message);
    return response.serverError("Could not disclose anonymous identity", error.message);
  }
};
