import { acceptStoredUpload, authenticateToken, createLimiter, imageUpload, route } from "@/server/kit";
import { createEvent, listEvents } from "@/server/controllers/communityController";

export const GET = route([authenticateToken], listEvents);
export const POST = route([authenticateToken, createLimiter, imageUpload(), acceptStoredUpload("event")], createEvent);
