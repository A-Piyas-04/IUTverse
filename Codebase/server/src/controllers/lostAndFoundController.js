const lostAndFoundService = require('../services/lostAndFoundService');
const multer = require('multer');
const response = require("../utils/responses");
const { enumValue, optionalText, positiveInt, requiredText } = require("../utils/validation");

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
        search: optionalText(req.query.search, { max: 200 })
      };

      if (filters.type && filters.type !== "all") {
        const type = enumValue(filters.type, ["lost", "found"], "Type");
        if (type.error) return response.badRequest(res, type.error);
        filters.type = type.value;
      }

      if (filters.status) {
        const status = enumValue(filters.status, ["active", "resolved", "archived", "deleted", "flagged"], "Status");
        if (status.error) return response.badRequest(res, status.error);
        filters.status = status.value;
      }
      
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
      const postIdResult = positiveInt(postId, "Post ID");
      if (postIdResult.error) return response.badRequest(res, postIdResult.error);

      const post = await lostAndFoundService.getPostById(postIdResult.value);
      
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

      const type = enumValue(postData.type, ["lost", "found"], "Type");
      if (type.error) return response.badRequest(res, type.error);
      const title = requiredText(postData.title, "Title", { max: 160 });
      if (title.error) return response.badRequest(res, title.error);
      const description = requiredText(postData.description, "Description", { max: 3000 });
      if (description.error) return response.badRequest(res, description.error);
      const location = requiredText(postData.location, "Location", { max: 200 });
      if (location.error) return response.badRequest(res, location.error);
      const contact = requiredText(postData.contact, "Contact", { max: 200 });
      if (contact.error) return response.badRequest(res, contact.error);

      const safePostData = {
        type: type.value,
        title: title.value,
        description: description.value,
        location: location.value,
        contact: contact.value,
      };
      
      try {
        const post = await lostAndFoundService.createPost(userId, safePostData, req.file);
        
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
      const postIdResult = positiveInt(postId, "Post ID");
      if (postIdResult.error) return response.badRequest(res, postIdResult.error);

      const updateData = {};
      if (req.body.type !== undefined) {
        const type = enumValue(req.body.type, ["lost", "found"], "Type");
        if (type.error) return response.badRequest(res, type.error);
        updateData.type = type.value;
      }
      for (const [field, label, max] of [
        ["title", "Title", 160],
        ["description", "Description", 3000],
        ["location", "Location", 200],
        ["contact", "Contact", 200],
      ]) {
        if (req.body[field] !== undefined) {
          const text = requiredText(req.body[field], label, { max });
          if (text.error) return response.badRequest(res, text.error);
          updateData[field] = text.value;
        }
      }

      const updatedPost = await lostAndFoundService.updatePost(postIdResult.value, userId, updateData, req.file);
      
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
      const postIdResult = positiveInt(postId, "Post ID");
      if (postIdResult.error) return response.badRequest(res, postIdResult.error);
      
      const result = await lostAndFoundService.deletePost(postIdResult.value, userId);
      
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
      const postIdResult = positiveInt(postId, "Post ID");
      if (postIdResult.error) return response.badRequest(res, postIdResult.error);
      
      const updatedPost = await lostAndFoundService.markAsResolved(postIdResult.value, userId);
      
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
      const postIdResult = positiveInt(postId, "Post ID");
      if (postIdResult.error) return response.badRequest(res, postIdResult.error);
      
      const updatedPost = await lostAndFoundService.markAsActive(postIdResult.value, userId);
      
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
