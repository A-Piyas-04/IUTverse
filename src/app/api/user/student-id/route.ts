import { authenticateToken, route } from "@/server/kit";
import { deleteStudentId, getStudentId, updateStudentId } from "@/server/controllers/userController";

export const GET = route([authenticateToken], getStudentId);
export const PUT = route([authenticateToken], updateStudentId);
export const DELETE = route([authenticateToken], deleteStudentId);
