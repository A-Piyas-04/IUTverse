import { authenticateToken, route } from "@/server/kit";
import { getUserFeed } from "@/server/controllers/postController";

export const GET = route([authenticateToken], getUserFeed);
