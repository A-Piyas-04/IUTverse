import { authenticateToken, route } from "@/server/kit";
import { markAsActive } from "@/server/controllers/lostAndFoundController";

export const PATCH = route([authenticateToken], markAsActive);
