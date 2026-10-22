import { authenticateToken, route } from "@/server/kit";
import { getMe } from "@/server/controllers/authController";

export const GET = route([authenticateToken], getMe);
