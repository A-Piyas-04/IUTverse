import { authenticateToken, createLimiter, requireAdmin, route } from "@/server/kit";
import { createDepartment, getAllDepartments } from "@/server/controllers/academicResourceController";

export const GET = route([], getAllDepartments);
export const POST = route([authenticateToken, requireAdmin, createLimiter], createDepartment);
