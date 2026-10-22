import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createJob, getAllJobs } from "@/server/controllers/jobController";

export const GET = route([authenticateToken], getAllJobs);
export const POST = route([authenticateToken, createLimiter], createJob);
