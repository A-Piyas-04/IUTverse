const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PostsService {
  // Get all posts with user information for homepage feed
  async getAllPosts() {
    try {
      const posts = await prisma.post.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profile: {
                select: {
                  profilePicture: true
                }
              }
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              reactions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform posts to include reaction counts and user info
      const transformedPosts = posts.map(post => ({
        id: post.id,
        content: post.content,
        category: post.category,
        isAnonymous: post.isAnonymous,
        createdAt: post.createdAt,
        user: post.isAnonymous ? {
          id: null,
          name: 'Anonymous',
          email: null,
          profilePicture: null
        } : {
          id: post.user.id,
          name: post.user.name || post.user.email.split('@')[0],
          email: post.user.email,
          profilePicture: post.user.profile?.profilePicture || null
        },
        likes: post.reactions.filter(r => r.reactionType === 'like').length,
        reactions: post.reactions.map(r => ({
          id: r.id,
          type: r.reactionType,
          user: {
            id: r.user.id,
            name: r.user.name || r.user.email?.split('@')[0] || 'Unknown'
          }
        })),
        totalReactions: post._count.reactions
      }));

      return transformedPosts;
    } catch (error) {
      console.error('Error fetching all posts:', error);
      throw error;
    }
  }

  // Get posts by specific user ID
  async getPostsByUserId(userId) {
    try {
      const posts = await prisma.post.findMany({
        where: {
          userId: userId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profile: {
                select: {
                  profilePicture: true
                }
              }
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              reactions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform posts
      const transformedPosts = posts.map(post => ({
        id: post.id,
        content: post.content,
        category: post.category,
        isAnonymous: post.isAnonymous,
        createdAt: post.createdAt,
        user: {
          id: post.user.id,
          name: post.user.name || post.user.email.split('@')[0],
          email: post.user.email,
          profilePicture: post.user.profile?.profilePicture || null
        },
        likes: post.reactions.filter(r => r.reactionType === 'like').length,
        reactions: post.reactions.map(r => ({
          id: r.id,
          type: r.reactionType,
          user: {
            id: r.user.id,
            name: r.user.name || r.user.email?.split('@')[0] || 'Unknown'
          }
        })),
        totalReactions: post._count.reactions
      }));

      return transformedPosts;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  }

  // Create a new post
  async createPost({ userId, content, category, isAnonymous }) {
    try {
      const post = await prisma.post.create({
        data: {
          userId,
          content,
          category,
          isAnonymous
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profile: {
                select: {
                  profilePicture: true
                }
              }
            }
          },
          _count: {
            select: {
              reactions: true
            }
          }
        }
      });

      // Transform the created post
      const transformedPost = {
        id: post.id,
        content: post.content,
        category: post.category,
        isAnonymous: post.isAnonymous,
        createdAt: post.createdAt,
        user: post.isAnonymous ? {
          id: null,
          name: 'Anonymous',
          email: null,
          profilePicture: null
        } : {
          id: post.user.id,
          name: post.user.name || post.user.email.split('@')[0],
          email: post.user.email,
          profilePicture: post.user.profile?.profilePicture || null
        },
        likes: 0,
        reactions: [],
        totalReactions: 0
      };

      return transformedPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // Get a single post by ID
  async getPostById(postId) {
    try {
      const post = await prisma.post.findUnique({
        where: {
          id: postId
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      return post;
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      throw error;
    }
  }

  // Delete a post
  async deletePost(postId) {
    try {
      // First delete all reactions to this post
      await prisma.postReaction.deleteMany({
        where: {
          postId: postId
        }
      });

      // Then delete the post
      await prisma.post.delete({
        where: {
          id: postId
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Toggle post reaction (like/unlike)
  async togglePostReaction(postId, userId, reactionType) {
    try {
      // Check if reaction already exists
      const existingReaction = await prisma.postReaction.findUnique({
        where: {
          postId_userId: {
            postId: postId,
            userId: userId
          }
        }
      });

      let added = false;

      if (existingReaction) {
        // Remove the reaction
        await prisma.postReaction.delete({
          where: {
            id: existingReaction.id
          }
        });
        added = false;
      } else {
        // Add the reaction
        await prisma.postReaction.create({
          data: {
            postId,
            userId,
            reactionType
          }
        });
        added = true;
      }

      // Get updated likes count
      const likesCount = await prisma.postReaction.count({
        where: {
          postId: postId,
          reactionType: 'like'
        }
      });

      return {
        added,
        likesCount
      };
    } catch (error) {
      console.error('Error toggling post reaction:', error);
      throw error;
    }
  }

  // Get all reactions for a post
  async getPostReactions(postId) {
    try {
      const reactions = await prisma.postReaction.findMany({
        where: {
          postId: postId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Group reactions by type
      const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.reactionType]) {
          acc[reaction.reactionType] = [];
        }
        acc[reaction.reactionType].push({
          user: {
            id: reaction.user.id,
            name: reaction.user.name || reaction.user.email.split('@')[0]
          }
        });
        return acc;
      }, {});

      return {
        total: reactions.length,
        likes: groupedReactions.like?.length || 0,
        reactions: groupedReactions
      };
    } catch (error) {
      console.error('Error fetching post reactions:', error);
      throw error;
    }
  }
}

module.exports = new PostsService();
