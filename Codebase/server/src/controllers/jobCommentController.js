const jobCommentService = require("../services/jobCommentService");

const createComment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobId } = req.params;
    const { content } = req.body;

    console.log("[JobCommentController] Attempting to create comment:", {
      userId,
      jobId,
      content: content?.substring(0, 50) + "...",
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
    console.log(
      "[JobCommentController] Comment created successfully:",
      comment.id
    );
    res.status(201).json(comment);
  } catch (error) {
    console.error("[JobCommentController] Error creating comment:", error);
    res
      .status(500)
      .json({ message: "Error creating comment", error: error.message });
  }
};

const getCommentsByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log("[JobCommentController] Fetching comments for job:", jobId);

    const comments = await jobCommentService.getCommentsByJobId(jobId);
    console.log("[JobCommentController] Found comments:", comments.length);
    res.json(comments);
  } catch (error) {
    console.error("[JobCommentController] Error fetching comments:", error);
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

    console.log("[JobCommentController] Attempting to create reply:", {
      userId,
      jobId,
      commentId,
      content: content?.substring(0, 50) + "...",
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
    console.log("[JobCommentController] Reply created successfully:", reply.id);
    res.status(201).json(reply);
  } catch (error) {
    console.error("[JobCommentController] Error creating reply:", error);
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

    console.log("[JobCommentController] Attempting to update comment:", {
      userId,
      commentId,
      content: content?.substring(0, 50) + "...",
    });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const comment = await jobCommentService.updateComment(
      commentId,
      content.trim(),
      userId
    );
    console.log(
      "[JobCommentController] Comment updated successfully:",
      comment.id
    );
    res.json(comment);
  } catch (error) {
    console.error("[JobCommentController] Error updating comment:", error);
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

    console.log("[JobCommentController] Attempting to delete comment:", {
      userId,
      commentId,
    });

    await jobCommentService.deleteComment(commentId, userId);
    console.log(
      "[JobCommentController] Comment deleted successfully:",
      commentId
    );
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("[JobCommentController] Error deleting comment:", error);
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
    console.log("[JobCommentController] Fetching comment:", commentId);

    const comment = await jobCommentService.getCommentById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json(comment);
  } catch (error) {
    console.error("[JobCommentController] Error fetching comment:", error);
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
