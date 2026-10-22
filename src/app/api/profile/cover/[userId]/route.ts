import { authenticateToken, route } from "@/server/kit";
import { getCoverPicture } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getCoverPicture);
