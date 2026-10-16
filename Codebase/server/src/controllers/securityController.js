const response = require("../utils/responses");
const logger = require("../utils/logger");
const securityService = require("../services/securityService");
const { positiveInt, requiredText, uuid } = require("../utils/validation");

const updateUserRole = async (req, res) => {
  try {
    const target = uuid(req.params.userId, "User ID");
    if (target.error) return response.badRequest(res, target.error);
    const role = String(req.body.role || "").toLowerCase();
    if (!["user", "mod", "admin"].includes(role)) {
      return response.badRequest(res, "Role must be one of: user, mod, admin");
    }
    const reason = requiredText(req.body.reason, "Reason", { min: 8, max: 500 });
    if (reason.error) return response.badRequest(res, reason.error);

    const updatedRole = await securityService.setUserRole({
      actorId: req.user.id,
      targetUserId: target.value,
      role,
      reason: reason.value,
    });
    return response.success(res, { userId: target.value, role: updatedRole }, "Role updated");
  } catch (error) {
    logger.error("Role update failed", error);
    if (/administrator|final active|own role|target user/i.test(error.message)) {
      return response.forbidden(res, error.message);
    }
    return response.serverError(res, "Could not update role", error.message);
  }
};

const disclosePostIdentity = async (req, res) => {
  try {
    const postId = positiveInt(req.params.postId, "Post ID");
    const reportId = positiveInt(req.body.reportId, "Report ID");
    const justification = requiredText(req.body.justification, "Justification", { min: 12, max: 1000 });
    if (postId.error || reportId.error || justification.error) {
      return response.badRequest(res, postId.error || reportId.error || justification.error);
    }
    const identity = await securityService.discloseAnonymousPostAuthor({
      actorId: req.user.id,
      postId: postId.value,
      reportId: reportId.value,
      justification: justification.value,
    });
    if (!identity) return response.notFound(res, "Anonymous post identity not found");
    return response.success(res, {
      userId: identity.user_id,
      displayName: identity.display_name,
      handle: identity.handle,
    });
  } catch (error) {
    logger.error("Anonymous identity disclosure failed", error);
    if (/moderator access|cannot act on reports/i.test(error.message)) return response.forbidden(res, error.message);
    if (/matching unresolved|anonymous post not found/i.test(error.message)) return response.badRequest(res, error.message);
    return response.serverError(res, "Could not disclose anonymous identity", error.message);
  }
};

module.exports = { disclosePostIdentity, updateUserRole };
