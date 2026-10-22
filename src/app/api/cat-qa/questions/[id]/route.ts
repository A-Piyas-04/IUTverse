import { authenticateToken, route } from "@/server/kit";
import { deleteQuestion, getQuestionById } from "@/server/controllers/catQAController";

export const GET = route([authenticateToken], getQuestionById);
export const DELETE = route([authenticateToken], deleteQuestion);
