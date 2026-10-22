import { authenticateToken, requireAdmin, route } from "@/server/kit";
import { getAllUsers } from "@/server/controllers/authController";

export const GET = route([authenticateToken, requireAdmin], getAllUsers);
