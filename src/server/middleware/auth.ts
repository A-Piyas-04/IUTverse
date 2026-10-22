import "server-only";
import { supabaseAdmin, isSupabaseAdminConfigured } from "../config/supabase";
import type { Step } from "../http/context";
import * as response from "../http/responses";
import * as securityService from "../services/securityService";

/**
 * Accepts a Supabase access token (`Authorization: Bearer <token>`), checks it
 * with Supabase Auth, and loads the member's role and membership from the
 * protected security tables. Only active members get through.
 */
export const authenticateToken: Step = async (ctx) => {
  const authHeader = ctx.request.headers.get("authorization");
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return response.unauthorized("Access token required");
  }

  if (isSupabaseAdminConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) return response.forbidden("Invalid Supabase token");

      const security = await securityService.getSecurityContext(data.user.id);
      if (security.membershipStatus !== "active") {
        return response.forbidden("Active IUTverse membership required");
      }

      ctx.user = {
        id: data.user.id,
        userId: data.user.id,
        email: data.user.email,
        name: security.displayName,
        role: security.role,
        membershipStatus: security.membershipStatus,
        membershipSource: security.membershipSource,
        supabaseUser: data.user,
      };
      return;
    } catch {
      return response.serverError("Unable to verify account membership");
    }
  }

  return response.serverError("Supabase Auth is not configured");
};

export const optionalAuth: Step = (ctx) => {
  if (!ctx.request.headers.get("authorization")) return;
  return authenticateToken(ctx);
};
