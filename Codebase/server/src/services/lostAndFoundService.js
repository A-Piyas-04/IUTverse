const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LostAndFoundService {
  // Get all lost and found posts with optional filters
  async getAllPosts(filters = {}) {
    try {
      const where = {};
      
      if (filters.type && filters.type !== 'all') {
        where.type = filters.type;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      const posts = await prisma.lostAndFound.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return posts;
    } catch (error) {
      console.error('Error getting lost and found posts:', error);
      throw error;
    }
  }
  
  // Get a single post by ID
  async getPostById(postId) {
    try {
      const post = await prisma.lostAndFound.findUnique({
        where: { id: parseInt(postId) },
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
      
      return post;
    } catch (error) {
      console.error('Error getting lost and found post by ID:', error);
      throw error;
    }
  }
  
  // Create a new lost and found post
  async createPost(userId, postData) {
    try {
      console.log('LostAndFoundService - Creating post with data:', {
        userId,
        type: postData.type,
        title: postData.title,
        description: postData.description?.substring(0, 20) + '...',
        hasImage: !!postData.image,
        location: postData.location,
        contact: postData.contact
      });
      
      // Validate userId is a number or can be parsed to a number
      let userIdInt;
      try {
        userIdInt = parseInt(userId);
        if (isNaN(userIdInt)) {
          throw new Error('Invalid user ID format');
        }
        console.log('LostAndFoundService - Parsed userId to:', userIdInt);
      } catch (parseError) {
        console.error('LostAndFoundService - Error parsing userId:', parseError);
        throw new Error(`Invalid userId: ${userId}. Must be a valid integer.`);
      }
      
      // Prepare data for database
      const createData = {
        userId: userIdInt,
        type: postData.type,
        title: postData.title,
        description: postData.description,
        image: postData.image || null, // Ensure null if image is undefined
        location: postData.location,
        contact: postData.contact,
        status: 'active'
      };
      
      console.log('LostAndFoundService - Final data being sent to database:', createData);
      
      const post = await prisma.lostAndFound.create({
        data: createData,
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
      
      console.log('LostAndFoundService - Post created successfully with ID:', post.id);
      return post;
    } catch (error) {
      console.error('LostAndFoundService - Error creating lost and found post:', error);
      console.error('LostAndFoundService - Error stack:', error.stack);
      
      // Provide more specific error messages based on error type
      if (error.code === 'P2003') {
        throw new Error('Foreign key constraint failed. User ID may not exist.');
      } else if (error.code === 'P2002') {
        throw new Error('A unique constraint would be violated on LostAndFound.');
      } else {
        throw error;
      }
    }
  }
  
  // Update a lost and found post
  async updatePost(postId, userId, updateData) {
    try {
      // First check if the post exists and belongs to the user
      const existingPost = await prisma.lostAndFound.findUnique({
        where: { id: parseInt(postId) }
      });
      
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      if (existingPost.userId !== parseInt(userId)) {
        throw new Error('Unauthorized to update this post');
      }
      
      const updatedPost = await prisma.lostAndFound.update({
        where: { id: parseInt(postId) },
        data: updateData,
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
      
      return updatedPost;
    } catch (error) {
      console.error('Error updating lost and found post:', error);
      throw error;
    }
  }
  
  // Delete a lost and found post
  async deletePost(postId, userId) {
    try {
      // First check if the post exists and belongs to the user
      const existingPost = await prisma.lostAndFound.findUnique({
        where: { id: parseInt(postId) }
      });
      
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      if (existingPost.userId !== parseInt(userId)) {
        throw new Error('Unauthorized to delete this post');
      }
      
      await prisma.lostAndFound.delete({
        where: { id: parseInt(postId) }
      });
      
      return { message: 'Post deleted successfully' };
    } catch (error) {
      console.error('Error deleting lost and found post:', error);
      throw error;
    }
  }
  
  // Mark post as resolved
  async markAsResolved(postId, userId) {
    try {
      return await this.updatePost(postId, userId, { status: 'resolved' });
    } catch (error) {
      console.error('Error marking post as resolved:', error);
      throw error;
    }
  }
  
  // Mark post as active
  async markAsActive(postId, userId) {
    try {
      return await this.updatePost(postId, userId, { status: 'active' });
    } catch (error) {
      console.error('Error marking post as active:', error);
      throw error;
    }
  }
  
  // Close database connection
  async disconnect() {
    await prisma.$disconnect();
  }
}

module.exports = new LostAndFoundService();