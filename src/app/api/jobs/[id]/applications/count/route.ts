import { authenticateToken, route } from "@/server/kit";
import { getApplicationCount } from "@/server/controllers/jobApplicationController";

export const GET = route([authenticateToken], getApplicationCount);
