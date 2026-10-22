import { authenticateToken, createLimiter, route } from "@/server/kit";
import { reportCreate, reportsList } from "@/server/controllers/communityController";

export const POST = route([authenticateToken, createLimiter], reportCreate);
export const GET = route([authenticateToken], reportsList);
