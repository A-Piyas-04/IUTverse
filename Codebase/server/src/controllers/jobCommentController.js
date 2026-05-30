const jobCommentService = require("../services/jobCommentService");
const logger = require("../utils/logger");

const createComment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;
    const { content } = req.body;

    logger.debug("[JobCommentController] Creating comment", {
      userId,
      jobId,
    });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const commentData = {
      content: content.trim(),
      authorId: userId,
      jobId: Number(jobId),
    };

    const comment = await jobCommentService.createComment(commentData);
    logger.info("[JobCommentController] Comment created", { id: comment.id });
    res.status(201).json(comment);
  } catch (error) {
    logger.error("[JobCommentController] Error creating comment", error);
    res
      .status(500)
      .json({ message: "Error creating comment", error: error.message });
  }
};

const getCommentsByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    logger.debug("[JobCommentController] Fetching comments for job", { jobId });

    const comments = await jobCommentService.getCommentsByJobId(jobId);
    logger.debug("[JobCommentController] Comments fetched", { jobId, count: comments.length });
    res.json(comments);
  } catch (error) {
    logger.error("[JobCommentController] Error fetching comments", error);
    res
      .status(500)
      .json({ message: "Error fetching comments", error: error.message });
  }
};

const createReply = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId, commentId } = req.params;
    const { content } = req.body;

    logger.debug("[JobCommentController] Creating reply", {
      userId,
      jobId,
      commentId,
    });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Reply content is required" });
    }

    const replyData = {
      content: content.trim(),
      authorId: userId,
      jobId: Number(jobId),
    };

    const reply = await jobCommentService.createReply(commentId, replyData);
    logger.info("[JobCommentController] Reply created", { id: reply.id });
    res.status(201).json(reply);
  } catch (error) {
    logger.error("[JobCommentController] Error creating reply", error);
    res
      .status(500)
      .json({ message: "Error creating reply", error: error.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { commentId } = req.params;
    const { content } = req.body;

    logger.debug("[JobCommentController] Updating comment", {
      userId,
      commentId,
    });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const comment = await jobCommentService.updateComment(
      commentId,
      content.trim(),
      userId
    );
    logger.info("[JobCommentController] Comment updated", { id: comment.id });
    res.json(comment);
  } catch (error) {
    logger.error("[JobCommentController] Error updating comment", error);
    if (error.message === "Unauthorized to update this comment") {
      return res.status(403).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error updating comment", error: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { commentId } = req.params;

    logger.debug("[JobCommentController] Deleting comment", {
      userId,
      commentId,
    });

    await jobCommentService.deleteComment(commentId, userId);
    logger.info("[JobCommentController] Comment deleted", { id: commentId });
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    logger.error("[JobCommentController] Error deleting comment", error);
    if (error.message === "Unauthorized to delete this comment") {
      return res.status(403).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Error deleting comment", error: error.message });
  }
};

const getCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;
    logger.debug("[JobCommentController] Fetching comment", { commentId });

    const comment = await jobCommentService.getCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json(comment);
  } catch (error) {
    logger.error("[JobCommentController] Error fetching comment", error);
    res
      .status(500)
      .json({ message: "Error fetching comment", error: error.message });
  }
};

module.exports = {
  createComment,
  getCommentsByJobId,
  createReply,
  updateComment,
  deleteComment,
  getCommentById,
};
