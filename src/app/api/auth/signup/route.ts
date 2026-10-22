import { authLimiter, route } from "@/server/kit";
import { signup } from "@/server/controllers/authController";

export const POST = route([authLimiter], signup);
