import { authenticateToken, route } from "@/server/kit";
import { deleteAnswer } from "@/server/controllers/catQAController";

export const DELETE = route([authenticateToken], deleteAnswer);
