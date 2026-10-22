import "server-only";
import type { Handler } from "../http/context";
import { json } from "../http/responses";
import confessionService from "../services/confessionService";
import logger from "../utils/logger";
import { canViewContent } from "../utils/contentVisibility";

export const createConfession: Handler = async (ctx) => {
  try {
    const hasPoll = Boolean(ctx.body?.poll);
    const tagCount = Array.isArray(ctx.body?.tags) ? ctx.body.tags.length : 0;
    logger.debug("[ConfessionController] Creating confession", {
      hasPoll,
      tagCount,
    });

    const confession = await confessionService.createConfession(ctx.body);
    logger.info("[ConfessionController] Confession created", { id: confession?.id });
    return json(201, confession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error creating confession", error);
    return json(500, { message: "Error creating confession", error: error.message });
  }
};

export const getAllConfessions: Handler = async (ctx) => {
  try {
    const { page, limit, tag } = ctx.query;
    const sortBy = (ctx.query.sortBy as string | undefined) ?? "recent";
    logger.debug("[ConfessionController] Fetching confessions", {
      page,
      limit,
      tag,
      sortBy,
    });

    // Convert page and limit to integers
    const pageNum = page ? parseInt(String(page), 10) : 1;
    const limitNum = limit ? parseInt(String(limit), 10) : 20;

    const confessions = await confessionService.getAllConfessions(
      pageNum,
      limitNum,
      tag as string | undefined,
      sortBy
    );

    return json(200, confessions);
  } catch (error: any) {
    logger.error("[ConfessionController] Error fetching confessions", error);
    return json(500, { message: "Error fetching confessions", error: error.message });
  }
};

export const getConfessionById: Handler = async (ctx) => {
  try {
    const { id } = ctx.params;
    logger.debug("[ConfessionController] Fetching confession", { id });

    const confession = await confessionService.getConfessionById(id);

    // Confessions have no stored author, so only moderators see non-active ones.
    if (!confession || !canViewContent({ status: confession.status, ownerId: null, viewer: ctx.user })) {
      return json(404, { message: "Confession not found" });
    }

    return json(200, confession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error fetching confession", error);
    return json(500, { message: "Error fetching confession", error: error.message });
  }
};

export const getRandomConfession: Handler = async () => {
  try {
    logger.debug("[ConfessionController] Fetching random confession");
    const confession = await confessionService.getRandomConfession();

    if (!confession) {
      return json(404, { message: "No confessions available" });
    }

    return json(200, confession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error fetching random confession", error);
    return json(500, { message: "Error fetching random confession", error: error.message });
  }
};

export const addReaction: Handler = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { reactionType } = ctx.body;
    const { userId } = ctx.user!;

    logger.debug("[ConfessionController] Adding reaction", {
      id,
      reactionType,
      userId,
    });

    await confessionService.addReaction(id, userId, reactionType);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    return json(200, updatedConfession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error adding reaction", error);

    if (error.message.includes("already reacted")) {
      return json(409, { message: "You have already reacted with this type", error: error.message });
    }

    return json(500, { message: "Error adding reaction", error: error.message });
  }
};

export const removeReaction: Handler = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { userId } = ctx.user!;

    logger.debug("[ConfessionController] Removing reaction", {
      id,
      userId,
    });

    await confessionService.removeReaction(id, userId);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    return json(200, updatedConfession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error removing reaction", error);
    return json(500, { message: "Error removing reaction", error: error.message });
  }
};

export const voteOnPoll: Handler = async (ctx) => {
  try {
    const { id, pollId } = ctx.params;
    const { optionId } = ctx.body;
    const { userId } = ctx.user!;

    logger.debug("[ConfessionController] Voting on poll", {
      id,
      pollId,
      optionId,
      userId,
    });

    await confessionService.voteOnPoll(pollId, optionId, userId);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    return json(200, updatedConfession);
  } catch (error: any) {
    logger.error("[ConfessionController] Error voting on poll", error);

    if (error.message.includes("already voted")) {
      return json(409, { message: "You have already voted on this poll", error: error.message });
    }

    return json(500, { message: "Error voting on poll", error: error.message });
  }
};

export const getUserReactions: Handler = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { userId } = ctx.user!;

    logger.debug("[ConfessionController] Getting user reactions", {
      id,
      userId,
    });

    const reactions = await confessionService.getUserReactions(id, userId);
    const reactionTypes = reactions.map((r) => r.reactionType);

    return json(200, { reactionTypes });
  } catch (error: any) {
    logger.error("[ConfessionController] Error getting user reactions", error);
    return json(500, { message: "Error getting user reactions", error: error.message });
  }
};

export const checkUserVoted: Handler = async (ctx) => {
  try {
    const { pollId } = ctx.params;
    const { userId } = ctx.user!;

    logger.debug("[ConfessionController] Checking if user voted", {
      pollId,
      userId,
    });

    const hasVoted = await confessionService.hasUserVoted(pollId, userId);

    return json(200, { hasVoted });
  } catch (error: any) {
    logger.error("[ConfessionController] Error checking user vote", error);
    return json(500, { message: "Error checking user vote", error: error.message });
  }
};

export const getAnalytics: Handler = async () => {
  try {
    logger.debug("[ConfessionController] Fetching confession analytics");

    const analytics = await confessionService.getConfessionAnalytics();

    return json(200, analytics);
  } catch (error: any) {
    logger.error("[ConfessionController] Error fetching analytics", error);
    return json(500, { message: "Error fetching analytics", error: error.message });
  }
};
