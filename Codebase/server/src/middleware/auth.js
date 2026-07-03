const { supabaseAdmin, isSupabaseAdminConfigured } = require('../config/supabase');
const response = require("../utils/responses");
const securityService = require("../services/securityService");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return response.unauthorized(res, 'Access token required');
  }

  if (isSupabaseAdminConfigured) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) return response.forbidden(res, 'Invalid Supabase token');

      const security = await securityService.getSecurityContext(data.user.id);
      if (security.membershipStatus !== "active") {
        return response.forbidden(res, "Active IUTverse membership required");
      }

      req.user = {
        id: data.user.id,
        userId: data.user.id,
        email: data.user.email,
        name: security.displayName,
        role: security.role,
        membershipStatus: security.membershipStatus,
        membershipSource: security.membershipSource,
        supabaseUser: data.user,
      };
      next();
      return;
    } catch {
      return response.serverError(res, "Unable to verify account membership");
    }
  }

  return response.serverError(res, 'Supabase Auth is not configured');
};

const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticateToken(req, res, next);
};

module.exports = { authenticateToken, optionalAuth };
