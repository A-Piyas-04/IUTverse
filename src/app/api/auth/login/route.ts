import { authLimiter, route } from "@/server/kit";
import { login } from "@/server/controllers/authController";

export const POST = route([authLimiter], login);
