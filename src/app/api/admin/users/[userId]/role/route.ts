import { authenticateToken, createLimiter, requireAdmin, route } from "@/server/kit";
import { updateUserRole } from "@/server/controllers/securityController";

export const PATCH = route([authenticateToken, requireAdmin, createLimiter], updateUserRole);
