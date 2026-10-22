import { authenticateToken, route } from "@/server/kit";
import { getJobApplications } from "@/server/controllers/jobApplicationController";

export const GET = route([authenticateToken], getJobApplications);
