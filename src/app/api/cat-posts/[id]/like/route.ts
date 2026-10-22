import { authenticateToken, createLimiter, route } from "@/server/kit";
import { toggleLike } from "@/server/controllers/catPostController";

export const POST = route([authenticateToken, createLimiter], toggleLike);
