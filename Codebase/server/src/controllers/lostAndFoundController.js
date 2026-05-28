const lostAndFoundService = require('../services/lostAndFoundService');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

class LostAndFoundController {
  // Get all lost and found posts
  async getAllPosts(req, res) {
    try {
      const filters = {
        type: req.query.type,
        status: req.query.status || 'active',
        search: req.query.search
      };
      
      const posts = await lostAndFoundService.getAllPosts(filters);
      
      res.json({
        success: true,
        data: posts
      });
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch posts',
        error: error.message
      });
    }
  }
  
  // Get a single post by ID
  async getPostById(req, res) {
    try {
      const { postId } = req.params;
      const post = await lostAndFoundService.getPostById(postId);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error in getPostById:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch post',
        error: error.message
      });
    }
  }
  
  // Create a new lost and found post
  async createPost(req, res) {
    try {
      const userId = req.user.id;
      const postData = req.body;

      const requiredFields = ['type', 'title', 'description', 'location', 'contact'];
      const missingFields = requiredFields.filter(field => !postData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return res.status(400).json({
          success: false,
          message: `${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`,
          missingFields: missingFields
        });
      }
      
      if (!['lost', 'found'].includes(postData.type)) {
        console.error('Invalid post type:', postData.type);
        return res.status(400).json({
          success: false,
          message: 'Type must be either "lost" or "found"'
        });
      }
      
      try {
        const post = await lostAndFoundService.createPost(userId, postData, req.file);
        
        return res.status(201).json({
          success: true,
          message: 'Post created successfully',
          data: post
        });
      } catch (serviceError) {
        console.error('Controller - Error in lostAndFoundService.createPost:', serviceError);
        return res.status(500).json({
          success: false,
          message: 'Error creating post in service layer',
          error: serviceError.message
        });
      }
    } catch (error) {
      console.error('Controller - Unhandled error in createPost:', error);
      console.error('Controller - Error stack:', error.stack);
      
      // Check if headers have already been sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error creating post',
          error: error.message
        });
      } else {
        console.error('Controller - Headers already sent, cannot send error response');
      }
    }
  }
  
  // Update a lost and found post
  async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const updatedPost = await lostAndFoundService.updatePost(postId, userId, updateData, req.file);
      
      res.json({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost
      });
    } catch (error) {
      console.error('Error in updatePost:', error);
      
      if (error.message === 'Post not found') {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
      
      if (error.message === 'Unauthorized to update this post') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to update this post'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update post',
        error: error.message
      });
    }
  }
  
  // Delete a lost and found post
  async deletePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      
      const result = await lostAndFoundService.deletePost(postId, userId);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error in deletePost:', error);
      
      if (error.message === 'Post not found') {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
      
      if (error.message === 'Unauthorized to delete this post') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to delete this post'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete post',
        error: error.message
      });
    }
  }
  
  // Mark post as resolved
  async markAsResolved(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      
      const updatedPost = await lostAndFoundService.markAsResolved(postId, userId);
      
      res.json({
        success: true,
        message: 'Post marked as resolved',
        data: updatedPost
      });
    } catch (error) {
      console.error('Error in markAsResolved:', error);
      
      if (error.message === 'Post not found') {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
      
      if (error.message === 'Unauthorized to update this post') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to update this post'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to mark post as resolved',
        error: error.message
      });
    }
  }
  
  // Mark post as active
  async markAsActive(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;
      
      const updatedPost = await lostAndFoundService.markAsActive(postId, userId);
      
      res.json({
        success: true,
        message: 'Post marked as active',
        data: updatedPost
      });
    } catch (error) {
      console.error('Error in markAsActive:', error);
      
      if (error.message === 'Post not found') {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
      
      if (error.message === 'Unauthorized to update this post') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to update this post'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to mark post as active',
        error: error.message
      });
    }
  }
}

module.exports = {
  controller: new LostAndFoundController(),
  upload
};
