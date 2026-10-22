import { authenticateToken, route } from "@/server/kit";
import { getProfileReferenceData } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getProfileReferenceData);
