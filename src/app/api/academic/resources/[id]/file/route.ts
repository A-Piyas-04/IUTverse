import { authenticateToken, route } from "@/server/kit";
import { resourceFile } from "@/server/controllers/communityController";

export const GET = route([authenticateToken], resourceFile);
