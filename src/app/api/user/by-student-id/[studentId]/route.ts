import { authenticateToken, requireAdmin, route } from "@/server/kit";
import { getUserByStudentId } from "@/server/controllers/userController";

export const GET = route([authenticateToken, requireAdmin], getUserByStudentId);
