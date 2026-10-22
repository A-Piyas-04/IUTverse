import { authenticateToken, createLimiter, route } from "@/server/kit";
import { validateIdParam, validatePollIdParam, validatePollVoteData } from "@/server/middleware/confessionValidation";
import { voteOnPoll } from "@/server/controllers/confessionController";

export const POST = route([authenticateToken, createLimiter, validateIdParam, validatePollIdParam, validatePollVoteData], voteOnPoll);
