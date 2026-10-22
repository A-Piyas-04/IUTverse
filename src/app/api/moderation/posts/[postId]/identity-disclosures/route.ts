import { authenticateToken, createLimiter, requireRole, route } from "@/server/kit";
import { disclosePostIdentity } from "@/server/controllers/securityController";

export const POST = route([authenticateToken, requireRole("admin", "mod"), createLimiter], disclosePostIdentity);
