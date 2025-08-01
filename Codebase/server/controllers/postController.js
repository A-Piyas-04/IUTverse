const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Helper function to handle file uploads
const saveImage = async (image) => {
  if (!image) return null;

  const uploadDir = path.join(__dirname, "../uploads/posts");

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate a unique filename
  const filename = `${uuidv4()}-${image.originalname}`;
  const filepath = path.join(uploadDir, filename);

  // Save the file
  await fs.promises.writeFile(filepath, image.buffer);

  // Return the relative path to be stored in the database
  return `/uploads/posts/${filename}`;
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { content, category, isAnonymous } = req.body;
    const userId = req.user.id; // Assuming req.user is set by authentication middleware

    // Handle image upload if present
    let imagePath = null;
    if (req.file) {
      imagePath = await saveImage(req.file);
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        category,
        isAnonymous: isAnonymous === "true" || isAnonymous === true,
        image: imagePath,
      },
    });

    return res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while creating post",
    });
  }
};

// Get all posts with pagination
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
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
            email: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        comments: {
          where: {
            parentCommentId: null, // Only fetch top-level comments
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
            _count: {
              select: {
                replies: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3, // Only include the most recent 3 comments
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    // Get total posts count for pagination info
    const totalPosts = await prisma.post.count();

    return res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching posts",
    });
  }
};

// Get a single post by ID with all comments
exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        comments: {
          where: {
            parentCommentId: null, // Only fetch top-level comments
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
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching post",
    });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category, isAnonymous } = req.body;
    const userId = req.user.id;

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to update this post",
      });
    }

    // Handle image upload if present
    let imagePath = existingPost.image;
    if (req.file) {
      // Delete the old image if it exists
      if (existingPost.image) {
        const oldImagePath = path.join(__dirname, "..", existingPost.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      imagePath = await saveImage(req.file);
    }

    const post = await prisma.post.update({
      where: { id: parseInt(id) },
      data: {
        content,
        category,
        isAnonymous: isAnonymous === "true" || isAnonymous === true,
        image: imagePath,
      },
    });

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while updating post",
    });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to delete this post",
      });
    }

    // Delete the image if it exists
    if (existingPost.image) {
      const imagePath = path.join(__dirname, "..", existingPost.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the post (cascade will delete related comments and reactions)
    await prisma.post.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while deleting post",
    });
  }
};

// Like/React to a post
exports.reactToPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;
    const userId = req.user.id;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if user already reacted to this post
    const existingReaction = await prisma.postReaction.findFirst({
      where: {
        postId: parseInt(id),
        userId,
      },
    });

    if (existingReaction) {
      // If reaction type is the same, remove the reaction (toggle)
      if (existingReaction.reactionType === reactionType) {
        await prisma.postReaction.delete({
          where: { id: existingReaction.id },
        });

        // Decrement like count
        await prisma.post.update({
          where: { id: parseInt(id) },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        });

        return res.status(200).json({
          success: true,
          message: "Reaction removed",
          action: "removed",
        });
      } else {
        // If reaction type is different, update the reaction
        await prisma.postReaction.update({
          where: { id: existingReaction.id },
          data: { reactionType },
        });

        return res.status(200).json({
          success: true,
          message: "Reaction updated",
          action: "updated",
        });
      }
    } else {
      // Create new reaction
      await prisma.postReaction.create({
        data: {
          postId: parseInt(id),
          userId,
          reactionType,
        },
      });

      // Increment like count
      await prisma.post.update({
        where: { id: parseInt(id) },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Reaction added",
        action: "added",
      });
    }
  } catch (error) {
    console.error("Error handling post reaction:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while handling post reaction",
    });
  }
};

// Get user's feed (posts from their department/batch)
exports.getUserFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get user info to filter posts by department/batch
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        department: true,
        batch: true,
      },
    });

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { user: { department: userInfo.department } },
          { user: { batch: userInfo.batch } },
        ],
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
            email: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            reactionType: true,
          },
        },
        comments: {
          where: {
            parentCommentId: null,
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
            _count: {
              select: {
                replies: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    // Get total posts count for pagination info
    const totalPosts = await prisma.post.count({
      where: {
        OR: [
          { user: { department: userInfo.department } },
          { user: { batch: userInfo.batch } },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user feed:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching user feed",
    });
  }
};
