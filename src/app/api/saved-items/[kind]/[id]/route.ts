import { authenticateToken, createLimiter, route } from "@/server/kit";
import { savedCreate, savedDelete, savedStatus } from "@/server/controllers/communityController";

export const POST = route([authenticateToken, createLimiter], savedCreate);
export const GET = route([authenticateToken], savedStatus);
export const DELETE = route([authenticateToken], savedDelete);
