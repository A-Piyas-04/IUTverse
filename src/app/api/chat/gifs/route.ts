import { authenticateToken, route } from "@/server/kit";
import { gifs } from "@/server/controllers/chatController";

export const GET = route([authenticateToken], gifs);
