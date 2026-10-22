import type { Step } from "../http/context";
import * as response from "../http/responses";

interface HasRole {
  role?: string | null;
}

const normalizeRole = (role: unknown) => String(role || "user").toLowerCase();

export const hasRole = (user: HasRole | null | undefined, allowedRoles: readonly string[]) => {
  const normalized = normalizeRole(user?.role);
  return allowedRoles.map(normalizeRole).includes(normalized);
};

export const requireRole = (...roles: string[]): Step => (ctx) => {
  if (!ctx.user) return response.unauthorized("Access token required");
  if (!hasRole(ctx.user, roles)) return response.forbidden("Insufficient permissions");
};

export const requireAdmin = requireRole("admin");

export const canModerate = (user: HasRole | null | undefined) => hasRole(user, ["admin", "mod", "moderator"]);
