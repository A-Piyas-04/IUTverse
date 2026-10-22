import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, optionalAuth, route } from "@/server/kit";
import { createPost, getAllPosts } from "@/server/controllers/lostAndFoundController";

export const GET = route([optionalAuth], getAllPosts);
export const POST = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("lostFound")], createPost);
