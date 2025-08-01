const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create a comment on a post
exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if parent comment exists if provided
    if (parentCommentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parseInt(parentCommentId) },
      });

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }

      // Make sure parent comment belongs to the same post
      if (parentComment.postId !== parseInt(postId)) {
        return res.status(400).json({
          success: false,
          message: "Parent comment does not belong to this post",
        });
      }
    }

    // Create comment
    const comment = await prisma.postComment.create({
      data: {
        content,
        postId: parseInt(postId),
        userId,
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        parentComment: parentCommentId
          ? {
              select: {
                id: true,
                content: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : undefined,
      },
    });

    return res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message,
    });
  }
};

// Get all comments for a post
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Get top-level comments
    const comments = await prisma.postComment.findMany({
      where: {
        postId: parseInt(postId),
        parentCommentId: null,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    profilePicture: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    // Get total comments count for pagination
    const totalComments = await prisma.postComment.count({
      where: {
        postId: parseInt(postId),
        parentCommentId: null,
      },
    });

    return res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

// Get replies for a comment
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Check if comment exists
    const comment = await prisma.postComment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Get replies
    const replies = await prisma.postComment.findMany({
      where: {
        parentCommentId: parseInt(commentId),
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: replies,
    });
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comment replies",
      error: error.message,
    });
  }
};

// Update a comment
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if comment exists and belongs to user
    const existingComment = await prisma.postComment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (existingComment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this comment",
      });
    }

    // Update the comment
    const comment = await prisma.postComment.update({
      where: { id: parseInt(commentId) },
      data: {
        content,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update comment",
      error: error.message,
    });
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const existingComment = await prisma.postComment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is authorized (comment owner or post owner)
    const post = await prisma.post.findUnique({
      where: { id: existingComment.postId },
    });

    if (existingComment.userId !== userId && post.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this comment",
      });
    }

    // Delete the comment (cascade will delete all replies)
    await prisma.postComment.delete({
      where: { id: parseInt(commentId) },
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};
