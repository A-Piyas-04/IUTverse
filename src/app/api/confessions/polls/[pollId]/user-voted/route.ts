import { authenticateToken, route } from "@/server/kit";
import { validatePollIdParam } from "@/server/middleware/confessionValidation";
import { checkUserVoted } from "@/server/controllers/confessionController";

export const GET = route([authenticateToken, validatePollIdParam], checkUserVoted);
