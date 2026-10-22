import { authenticateToken, createLimiter, route } from "@/server/kit";
import { applyToJob, removeApplication } from "@/server/controllers/jobApplicationController";

export const POST = route([authenticateToken, createLimiter], applyToJob);
export const DELETE = route([authenticateToken], removeApplication);
