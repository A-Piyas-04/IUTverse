import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, route } from "@/server/kit";
import { createPost, getAllPosts } from "@/server/controllers/catPostController";

export const GET = route([authenticateToken], getAllPosts);
export const POST = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("catPost")], createPost);
