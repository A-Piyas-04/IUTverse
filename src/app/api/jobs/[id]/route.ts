import { authenticateToken, createLimiter, route } from "@/server/kit";
import { deleteJob, getJobById, updateJob } from "@/server/controllers/jobController";

export const GET = route([authenticateToken], getJobById);
export const PUT = route([authenticateToken, createLimiter], updateJob);
export const DELETE = route([authenticateToken, createLimiter], deleteJob);
