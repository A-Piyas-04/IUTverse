const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

class CatPostService {
  async createPost(userId, caption, imageFile) {
    try {
      // Handle image upload
      let imagePath = null;
      if (imageFile) {
        const uploadDir = path.join(__dirname, '../../uploads/cat-posts');
        await fs.mkdir(uploadDir, { recursive: true });
        
        const fileName = `${Date.now()}-${imageFile.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        
        await fs.writeFile(filePath, imageFile.buffer);
        imagePath = `/uploads/cat-posts/${fileName}`;
      }

      const post = await prisma.catPost.create({
        data: {
          ...(userId && { userId }), // Only include userId if it exists
          caption,
          image: imagePath,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      return post;
    } catch (error) {
      console.error('Error creating cat post:', error);
      throw new Error('Failed to create cat post');
    }
  }

  async getAllPosts(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const posts = await prisma.catPost.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      const total = await prisma.catPost.count();
      
      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching cat posts:', error);
      throw new Error('Failed to fetch cat posts');
    }
  }

  async toggleLike(userId, postId) {
    try {
      const existingLike = await prisma.catPostLike.findUnique({
        where: {
          userId_catPostId: {
            userId,
            catPostId: postId,
          },
        },
      });

      if (existingLike) {
        // Unlike
        await prisma.catPostLike.delete({
          where: {
            id: existingLike.id,
          },
        });
        return { liked: false };
      } else {
        // Like
        await prisma.catPostLike.create({
          data: {
            userId,
            catPostId: postId,
          },
        });
        return { liked: true };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw new Error('Failed to toggle like');
    }
  }

  async addComment(userId, postId, content) {
    try {
      const comment = await prisma.catPostComment.create({
        data: {
          userId,
          catPostId: postId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  async getPostById(postId) {
    try {
      const post = await prisma.catPost.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      return post;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  async deletePost(userId, postId) {
    try {
      const post = await prisma.catPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.userId !== userId) {
        throw new Error('Unauthorized to delete this post');
      }

      // Delete image file if exists
      if (post.image) {
        const imagePath = path.join(__dirname, '../../', post.image);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.warn('Failed to delete image file:', err.message);
        }
      }

      await prisma.catPost.delete({
        where: { id: postId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
}

module.exports = new CatPostService();