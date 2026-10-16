const response = require("../utils/responses");

const normalizeRole = (role) => String(role || "user").toLowerCase();

const hasRole = (user, allowedRoles) => {
  const normalized = normalizeRole(user?.role);
  return allowedRoles.map(normalizeRole).includes(normalized);
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return response.unauthorized(res, "Access token required");
  if (!hasRole(req.user, roles)) return response.forbidden(res, "Insufficient permissions");
  return next();
};

const requireAdmin = requireRole("admin");

const canModerate = (user) => hasRole(user, ["admin", "mod", "moderator"]);

module.exports = {
  canModerate,
  hasRole,
  requireAdmin,
  requireRole,
};
