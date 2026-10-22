import { authenticateToken, createLimiter, route } from "@/server/kit";
import { updateRsvp } from "@/server/controllers/communityController";

export const PUT = route([authenticateToken, createLimiter], updateRsvp);
