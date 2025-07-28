const catPostService = require('../services/catPostService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/cat-posts';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
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

class CatPostController {
  // Get all cat posts
  async getAllCatPosts(req, res) {
    try {
      console.log('CatPostController - GET /cat-posts');
      console.log('CatPostController - Query params:', req.query);
      console.log('CatPostController - User:', req.user);
      
      const filters = {
        search: req.query.search
      };
      
      const posts = await catPostService.getAllCatPosts(filters);
      
      // Transform posts to include like status for current user
      const transformedPosts = posts.map(post => {
        const isLiked = req.user ? post.likes.some(like => like.userId === req.user.id) : false;
        
        return {
          id: post.id,
          caption: post.caption,
          image: `${req.protocol}://${req.get('host')}/${post.image}`,
          user: post.user.name || 'Anonymous',
          time: this.getTimeAgo(post.createdAt),
          type: 'image',
          likes: post._count.likes,
          commentCount: post._count.comments,
          isLiked,
          comments: post.comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            user: comment.user,
            createdAt: comment.createdAt
          })),
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        };
      });
      
      console.log('CatPostController - Returning posts:', transformedPosts.length);
      res.status(200).json({
        success: true,
        data: transformedPosts,
        message: 'Cat posts retrieved successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error getting cat posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cat posts',
        error: error.message
      });
    }
  }
  
  // Get a specific cat post by ID
  async getCatPostById(req, res) {
    try {
      console.log('CatPostController - GET /cat-posts/:id');
      console.log('CatPostController - Post ID:', req.params.id);
      console.log('CatPostController - User:', req.user);
      
      const postId = req.params.id;
      const userId = req.user ? req.user.id : null;
      
      const post = await catPostService.getCatPostById(postId, userId);
      
      // Transform post to include like status for current user
      const isLiked = req.user ? post.likes.some(like => like.userId === req.user.id) : false;
      
      const transformedPost = {
        id: post.id,
        caption: post.caption,
        image: `${req.protocol}://${req.get('host')}/${post.image}`,
        user: post.user.name || 'Anonymous',
        time: this.getTimeAgo(post.createdAt),
        type: 'image',
        likes: post._count.likes,
        commentCount: post._count.comments,
        isLiked,
        comments: post.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          user: comment.user,
          createdAt: comment.createdAt
        })),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      };
      
      console.log('CatPostController - Returning post:', transformedPost.id);
      res.status(200).json({
        success: true,
        data: transformedPost,
        message: 'Cat post retrieved successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error getting cat post:', error);
      
      if (error.message === 'Cat post not found') {
        res.status(404).json({
          success: false,
          message: 'Cat post not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve cat post',
          error: error.message
        });
      }
    }
  }
  
  // Create a new cat post
  async createCatPost(req, res) {
    try {
      console.log('CatPostController - POST /cat-posts');
      console.log('CatPostController - Request body:', req.body);
      console.log('CatPostController - Request file:', req.file);
      console.log('CatPostController - User:', req.user);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const postData = req.body;
      
      // Validate required fields
      const requiredFields = ['caption'];
      for (const field of requiredFields) {
        if (!postData[field] || postData[field].trim() === '') {
          console.error(`CatPostController - Missing required field: ${field}`);
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`
          });
        }
      }
      
      if (!req.file) {
        console.error('CatPostController - No image file provided');
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }
      
      // Prepare data for service
      const serviceData = {
        userId: req.user.id,
        caption: postData.caption.trim(),
        image: req.file.path.replace(/\\/g, '/') // Normalize path separators
      };
      
      console.log('CatPostController - Service data:', serviceData);
      
      const post = await catPostService.createCatPost(serviceData);
      
      // Transform post for response
      const transformedPost = {
        id: post.id,
        caption: post.caption,
        image: `${req.protocol}://${req.get('host')}/${post.image}`,
        user: post.user.name || 'Anonymous',
        time: this.getTimeAgo(post.createdAt),
        type: 'image',
        likes: post._count.likes,
        commentCount: post._count.comments,
        isLiked: false, // New post, user hasn't liked it yet
        comments: [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      };
      
      console.log('CatPostController - Post created successfully:', transformedPost.id);
      res.status(201).json({
        success: true,
        data: transformedPost,
        message: 'Cat post created successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error creating cat post:', error);
      console.error('CatPostController - Error stack:', error.stack);
      
      // Clean up uploaded file if there was an error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('CatPostController - Cleaned up uploaded file after error');
        } catch (cleanupError) {
          console.error('CatPostController - Error cleaning up file:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create cat post',
        error: error.message
      });
    }
  }
  
  // Toggle like on a cat post
  async toggleLikeCatPost(req, res) {
    try {
      console.log('CatPostController - POST /cat-posts/:id/like');
      console.log('CatPostController - Post ID:', req.params.id);
      console.log('CatPostController - User:', req.user);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const postId = req.params.id;
      const userId = req.user.id;
      
      const result = await catPostService.toggleLikeCatPost(postId, userId);
      
      console.log('CatPostController - Like toggled successfully:', result);
      res.status(200).json({
        success: true,
        data: result,
        message: result.isLiked ? 'Post liked successfully' : 'Post unliked successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error toggling like:', error);
      
      if (error.message === 'Cat post not found') {
        res.status(404).json({
          success: false,
          message: 'Cat post not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to toggle like',
          error: error.message
        });
      }
    }
  }
  
  // Add a comment to a cat post
  async addCommentToCatPost(req, res) {
    try {
      console.log('CatPostController - POST /cat-posts/:id/comments');
      console.log('CatPostController - Post ID:', req.params.id);
      console.log('CatPostController - Request body:', req.body);
      console.log('CatPostController - User:', req.user);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const postId = req.params.id;
      const userId = req.user.id;
      const commentData = req.body;
      
      if (!commentData.content || !commentData.content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }
      
      const comment = await catPostService.addCommentToCatPost(postId, userId, commentData);
      
      console.log('CatPostController - Comment added successfully:', comment.id);
      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error adding comment:', error);
      
      if (error.message === 'Cat post not found') {
        res.status(404).json({
          success: false,
          message: 'Cat post not found'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to add comment',
          error: error.message
        });
      }
    }
  }
  
  // Get comments for a cat post
  async getCatPostComments(req, res) {
    try {
      console.log('CatPostController - GET /cat-posts/:id/comments');
      console.log('CatPostController - Post ID:', req.params.id);
      
      const postId = req.params.id;
      const comments = await catPostService.getCatPostComments(postId);
      
      console.log('CatPostController - Returning comments:', comments.length);
      res.status(200).json({
        success: true,
        data: comments,
        message: 'Comments retrieved successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error getting comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve comments',
        error: error.message
      });
    }
  }
  
  // Delete a cat post
  async deleteCatPost(req, res) {
    try {
      console.log('CatPostController - DELETE /cat-posts/:id');
      console.log('CatPostController - Post ID:', req.params.id);
      console.log('CatPostController - User:', req.user);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const postId = req.params.id;
      const userId = req.user.id;
      
      const result = await catPostService.deleteCatPost(postId, userId);
      
      console.log('CatPostController - Post deleted successfully');
      res.status(200).json({
        success: true,
        data: result,
        message: 'Cat post deleted successfully'
      });
    } catch (error) {
      console.error('CatPostController - Error deleting post:', error);
      
      if (error.message === 'Cat post not found') {
        res.status(404).json({
          success: false,
          message: 'Cat post not found'
        });
      } else if (error.message === 'You can only delete your own posts') {
        res.status(403).json({
          success: false,
          message: 'You can only delete your own posts'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete cat post',
          error: error.message
        });
      }
    }
  }
  
  // Helper method to calculate time ago
  getTimeAgo(date) {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  }
}

const catPostController = new CatPostController();

// Export the controller methods with multer middleware for file upload
module.exports = {
  getAllCatPosts: catPostController.getAllCatPosts.bind(catPostController),
  getCatPostById: catPostController.getCatPostById.bind(catPostController),
  createCatPost: [upload.single('image'), catPostController.createCatPost.bind(catPostController)],
  toggleLikeCatPost: catPostController.toggleLikeCatPost.bind(catPostController),
  addCommentToCatPost: catPostController.addCommentToCatPost.bind(catPostController),
  getCatPostComments: catPostController.getCatPostComments.bind(catPostController),
  deleteCatPost: catPostController.deleteCatPost.bind(catPostController)
};