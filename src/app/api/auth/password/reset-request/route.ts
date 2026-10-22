import { authLimiter, route } from "@/server/kit";
import { requestPasswordReset } from "@/server/controllers/authController";

export const POST = route([authLimiter], requestPasswordReset);
