import { authenticateToken, lookupLimiter, route } from "@/server/kit";
import { checkStudentIdAvailability } from "@/server/controllers/userController";

export const GET = route([authenticateToken, lookupLimiter], checkStudentIdAvailability);
