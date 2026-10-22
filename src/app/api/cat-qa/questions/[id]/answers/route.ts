import { authenticateToken, createLimiter, route } from "@/server/kit";
import { addAnswer } from "@/server/controllers/catQAController";

export const POST = route([authenticateToken, createLimiter], addAnswer);
