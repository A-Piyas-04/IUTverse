import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, route } from "@/server/kit";
import { deleteEvent, updateEvent } from "@/server/controllers/communityController";

export const PUT = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("event")], updateEvent);
export const DELETE = route([authenticateToken, createLimiter], deleteEvent);
