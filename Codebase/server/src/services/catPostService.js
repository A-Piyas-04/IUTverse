const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CatPostService {
  // Get all cat posts with user info, likes count, and comments count
  async getAllCatPosts(filters = {}) {
    try {
      console.log('CatPostService - Getting all cat posts with filters:', filters);
      
      const where = {};
      
      if (filters.search) {
        where.caption = {
          contains: filters.search,
          mode: 'insensitive'
        };
      }
      
      const posts = await prisma.catPost.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          likes: {
            select: {
              userId: true
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('CatPostService - Found posts:', posts.length);
      return posts;
    } catch (error) {
      console.error('CatPostService - Error getting cat posts:', error);
      throw error;
    }
  }
  
  // Get a specific cat post by ID
  async getCatPostById(postId, userId = null) {
    try {
      console.log('CatPostService - Getting cat post by ID:', postId);
      
      const post = await prisma.catPost.findUnique({
        where: { id: parseInt(postId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          likes: {
            select: {
              userId: true
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });
      
      if (!post) {
        throw new Error('Cat post not found');
      }
      
      console.log('CatPostService - Found post:', post.id);
      return post;
    } catch (error) {
      console.error('CatPostService - Error getting cat post by ID:', error);
      throw error;
    }
  }
  
  // Create a new cat post
  async createCatPost(postData) {
    try {
      console.log('CatPostService - Creating cat post with data:', postData);
      
      const { userId, caption, image } = postData;
      
      // Validate required fields
      if (!userId || !caption || !image) {
        throw new Error('Missing required fields: userId, caption, and image are required');
      }
      
      const post = await prisma.catPost.create({
        data: {
          userId: parseInt(userId),
          caption,
          image
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          likes: {
            select: {
              userId: true
            }
          },
          comments: {
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
              likes: true,
              comments: true
            }
          }
        }
      });
      
      console.log('CatPostService - Post created successfully with ID:', post.id);
      return post;
    } catch (error) {
      console.error('CatPostService - Error creating cat post:', error);
      console.error('CatPostService - Error stack:', error.stack);
      
      // Provide more specific error messages based on error type
      if (error.code === 'P2003') {
        throw new Error('Foreign key constraint failed. User ID may not exist.');
      } else if (error.code === 'P2002') {
        throw new Error('A unique constraint would be violated on CatPost.');
      } else {
        throw error;
      }
    }
  }
  
  // Toggle like on a cat post
  async toggleLikeCatPost(postId, userId) {
    try {
      console.log('CatPostService - Toggling like for post:', postId, 'user:', userId);
      
      const postIdInt = parseInt(postId);
      const userIdInt = parseInt(userId);
      
      // Check if the post exists
      const post = await prisma.catPost.findUnique({
        where: { id: postIdInt }
      });
      
      if (!post) {
        throw new Error('Cat post not found');
      }
      
      // Check if user has already liked this post
      const existingLike = await prisma.catPostLike.findUnique({
        where: {
          userId_catPostId: {
            userId: userIdInt,
            catPostId: postIdInt
          }
        }
      });
      
      let isLiked;
      
      if (existingLike) {
        // Unlike the post
        await prisma.catPostLike.delete({
          where: {
            userId_catPostId: {
              userId: userIdInt,
              catPostId: postIdInt
            }
          }
        });
        isLiked = false;
        console.log('CatPostService - Post unliked');
      } else {
        // Like the post
        await prisma.catPostLike.create({
          data: {
            userId: userIdInt,
            catPostId: postIdInt
          }
        });
        isLiked = true;
        console.log('CatPostService - Post liked');
      }
      
      // Get updated like count
      const likeCount = await prisma.catPostLike.count({
        where: { catPostId: postIdInt }
      });
      
      return {
        isLiked,
        likes: likeCount
      };
    } catch (error) {
      console.error('CatPostService - Error toggling like:', error);
      throw error;
    }
  }
  
  // Add a comment to a cat post
  async addCommentToCatPost(postId, userId, commentData) {
    try {
      console.log('CatPostService - Adding comment to post:', postId, 'user:', userId, 'data:', commentData);
      
      const postIdInt = parseInt(postId);
      const userIdInt = parseInt(userId);
      const { content } = commentData;
      
      if (!content || !content.trim()) {
        throw new Error('Comment content is required');
      }
      
      // Check if the post exists
      const post = await prisma.catPost.findUnique({
        where: { id: postIdInt }
      });
      
      if (!post) {
        throw new Error('Cat post not found');
      }
      
      const comment = await prisma.catPostComment.create({
        data: {
          userId: userIdInt,
          catPostId: postIdInt,
          content: content.trim()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      console.log('CatPostService - Comment created successfully with ID:', comment.id);
      return comment;
    } catch (error) {
      console.error('CatPostService - Error adding comment:', error);
      throw error;
    }
  }
  
  // Get comments for a cat post
  async getCatPostComments(postId) {
    try {
      console.log('CatPostService - Getting comments for post:', postId);
      
      const comments = await prisma.catPostComment.findMany({
        where: { catPostId: parseInt(postId) },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log('CatPostService - Found comments:', comments.length);
      return comments;
    } catch (error) {
      console.error('CatPostService - Error getting comments:', error);
      throw error;
    }
  }
  
  // Delete a cat post (only by the author)
  async deleteCatPost(postId, userId) {
    try {
      console.log('CatPostService - Deleting cat post:', postId, 'by user:', userId);
      
      const postIdInt = parseInt(postId);
      const userIdInt = parseInt(userId);
      
      // Check if the post exists and belongs to the user
      const post = await prisma.catPost.findUnique({
        where: { id: postIdInt }
      });
      
      if (!post) {
        throw new Error('Cat post not found');
      }
      
      if (post.userId !== userIdInt) {
        throw new Error('You can only delete your own posts');
      }
      
      // Delete the post (likes and comments will be deleted automatically due to cascade)
      await prisma.catPost.delete({
        where: { id: postIdInt }
      });
      
      console.log('CatPostService - Post deleted successfully');
      return { message: 'Post deleted successfully' };
    } catch (error) {
      console.error('CatPostService - Error deleting post:', error);
      throw error;
    }
  }
}

module.exports = new CatPostService();