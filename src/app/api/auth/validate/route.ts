import { authenticateToken, route } from "@/server/kit";
import { validateToken } from "@/server/controllers/authController";

export const GET = route([authenticateToken], validateToken);
