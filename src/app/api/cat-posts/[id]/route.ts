import { authenticateToken, route } from "@/server/kit";
import { deletePost, getPostById } from "@/server/controllers/catPostController";

export const GET = route([authenticateToken], getPostById);
export const DELETE = route([authenticateToken], deletePost);
