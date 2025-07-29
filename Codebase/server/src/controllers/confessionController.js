const confessionService = require("../services/confessionService");

const createConfession = async (req, res) => {
  try {
    console.log(
      "[ConfessionController] Attempting to create confession:",
      req.body
    );
    const confessionData = req.body;

    const confession = await confessionService.createConfession(confessionData);
    console.log(
      "[ConfessionController] Confession created successfully:",
      confession
    );
    res.status(201).json(confession);
  } catch (error) {
    console.error("[ConfessionController] Error creating confession:", error);
    res.status(500).json({
      message: "Error creating confession",
      error: error.message,
    });
  }
};

const getAllConfessions = async (req, res) => {
  try {
    const { page, limit, tag, sortBy = "recent" } = req.query;
    console.log("[ConfessionController] Fetching confessions with params:", {
      page,
      limit,
      tag,
      sortBy,
    });

    // Convert page and limit to integers
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const confessions = await confessionService.getAllConfessions(
      pageNum,
      limitNum,
      tag,
      sortBy
    );

    res.json(confessions);
  } catch (error) {
    console.error("[ConfessionController] Error fetching confessions:", error);
    res.status(500).json({
      message: "Error fetching confessions",
      error: error.message,
    });
  }
};

const getConfessionById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[ConfessionController] Fetching confession with id:", id);

    const confession = await confessionService.getConfessionById(id);

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    res.json(confession);
  } catch (error) {
    console.error("[ConfessionController] Error fetching confession:", error);
    res.status(500).json({
      message: "Error fetching confession",
      error: error.message,
    });
  }
};

const getRandomConfession = async (req, res) => {
  try {
    console.log("[ConfessionController] Fetching random confession");
    const confession = await confessionService.getRandomConfession();

    if (!confession) {
      return res.status(404).json({ message: "No confessions available" });
    }

    res.json(confession);
  } catch (error) {
    console.error(
      "[ConfessionController] Error fetching random confession:",
      error
    );
    res.status(500).json({
      message: "Error fetching random confession",
      error: error.message,
    });
  }
};

const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;
    const { userId } = req.user;

    console.log("[ConfessionController] Adding reaction:", {
      id,
      reactionType,
      userId,
    });

    await confessionService.addReaction(id, userId, reactionType);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    res.json(updatedConfession);
  } catch (error) {
    console.error("[ConfessionController] Error adding reaction:", error);

    if (error.message.includes("already reacted")) {
      return res.status(409).json({
        message: "You have already reacted with this type",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Error adding reaction",
      error: error.message,
    });
  }
};

const removeReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    console.log("[ConfessionController] Removing reaction:", {
      id,
      userId,
    });

    await confessionService.removeReaction(id, userId);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    res.json(updatedConfession);
  } catch (error) {
    console.error("[ConfessionController] Error removing reaction:", error);
    res.status(500).json({
      message: "Error removing reaction",
      error: error.message,
    });
  }
};

const voteOnPoll = async (req, res) => {
  try {
    const { id, pollId } = req.params;
    const { optionId } = req.body;
    const { userId } = req.user;

    console.log("[ConfessionController] Voting on poll:", {
      id,
      pollId,
      optionId,
      userId,
    });

    await confessionService.voteOnPoll(pollId, optionId, userId);

    // Return updated confession
    const updatedConfession = await confessionService.getConfessionById(id);
    res.json(updatedConfession);
  } catch (error) {
    console.error("[ConfessionController] Error voting on poll:", error);

    if (error.message.includes("already voted")) {
      return res.status(409).json({
        message: "You have already voted on this poll",
        error: error.message,
      });
    }

    res.status(500).json({
      message: "Error voting on poll",
      error: error.message,
    });
  }
};

const getUserReactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    console.log("[ConfessionController] Getting user reactions:", {
      id,
      userId,
    });

    const reactions = await confessionService.getUserReactions(id, userId);
    const reactionTypes = reactions.map((r) => r.reactionType);

    res.json({ reactionTypes });
  } catch (error) {
    console.error(
      "[ConfessionController] Error getting user reactions:",
      error
    );
    res.status(500).json({
      message: "Error getting user reactions",
      error: error.message,
    });
  }
};

const checkUserVoted = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { userId } = req.user;

    console.log("[ConfessionController] Checking if user voted:", {
      pollId,
      userId,
    });

    const hasVoted = await confessionService.hasUserVoted(pollId, userId);

    res.json({ hasVoted });
  } catch (error) {
    console.error("[ConfessionController] Error checking user vote:", error);
    res.status(500).json({
      message: "Error checking user vote",
      error: error.message,
    });
  }
};

const getAnalytics = async (req, res) => {
  try {
    console.log("[ConfessionController] Fetching confession analytics");

    const analytics = await confessionService.getConfessionAnalytics();

    res.json(analytics);
  } catch (error) {
    console.error("[ConfessionController] Error fetching analytics:", error);
    res.status(500).json({
      message: "Error fetching analytics",
      error: error.message,
    });
  }
};

module.exports = {
  createConfession,
  getAllConfessions,
  getConfessionById,
  getRandomConfession,
  addReaction,
  removeReaction,
  voteOnPoll,
  getUserReactions,
  checkUserVoted,
  getAnalytics,
};
