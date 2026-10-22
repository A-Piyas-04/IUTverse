import { authenticateToken, route } from "@/server/kit";
import { getUserApplicationStatus } from "@/server/controllers/jobApplicationController";

export const GET = route([authenticateToken], getUserApplicationStatus);
