import { authLimiter, authenticateToken, route } from "@/server/kit";
import { changePassword } from "@/server/controllers/authController";

export const PUT = route([authenticateToken, authLimiter], changePassword);
