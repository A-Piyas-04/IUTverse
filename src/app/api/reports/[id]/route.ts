import { authenticateToken, createLimiter, route } from "@/server/kit";
import { reportUpdate } from "@/server/controllers/communityController";

export const PATCH = route([authenticateToken, createLimiter], reportUpdate);
