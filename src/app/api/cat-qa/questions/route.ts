import { authenticateToken, createLimiter, route } from "@/server/kit";
import { createQuestion, getAllQuestions } from "@/server/controllers/catQAController";

export const GET = route([authenticateToken], getAllQuestions);
export const POST = route([authenticateToken, createLimiter], createQuestion);
