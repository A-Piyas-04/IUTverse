import { authenticateToken, route } from "@/server/kit";
import { createProfile, getOwnProfile, updateProfile } from "@/server/controllers/profileController";

export const GET = route([authenticateToken], getOwnProfile);
export const POST = route([authenticateToken], createProfile);
export const PUT = route([authenticateToken], updateProfile);
