import { authenticateToken, route } from "@/server/kit";
import { markAsResolved } from "@/server/controllers/lostAndFoundController";

export const PATCH = route([authenticateToken], markAsResolved);
