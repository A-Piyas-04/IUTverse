import { authenticateToken, route } from "@/server/kit";
import { getOwnProfile, patchOwnProfile } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getOwnProfile);
export const PATCH = route([authenticateToken], patchOwnProfile);
