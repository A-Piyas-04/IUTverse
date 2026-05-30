const catPostService = require('../services/catPostService');
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { pagination, positiveInt, requiredText } = require("../utils/validation");

const createPost = async (req, res) => {
  try {
    // Get userId from authenticated user, or null for anonymous posts
    const userId = req.user ? req.user.id : null;
    const { caption } = req.body;
    const image = req.file;

    const captionResult = requiredText(caption, "Caption", { max: 1000 });
    if (captionResult.error) return response.badRequest(res, captionResult.error);
    
    const post = await catPostService.createPost(userId, captionResult.value, image);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    logger.error('Create post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const safePage = pagination(page, limit, 100);
    
    const result = await catPostService.getAllPosts(safePage.page, safePage.limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Get posts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = positiveInt(req.params.id, "Post ID");
    if (postId.error) return response.badRequest(res, postId.error);
    
    const post = await catPostService.getPostById(postId.value);
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    logger.error('Get post error:', error);
    if (error.message === 'Post not found') {
      res.status(404).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

const toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = positiveInt(req.params.id, "Post ID");
    if (postId.error) return response.badRequest(res, postId.error);
    
    const result = await catPostService.toggleLike(userId, postId.value);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Toggle like error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = positiveInt(req.params.id, "Post ID");
    const { content } = req.body;
    if (postId.error) return response.badRequest(res, postId.error);

    const contentResult = requiredText(content, "Comment content", { max: 1000 });
    if (contentResult.error) return response.badRequest(res, contentResult.error);
    
    const comment = await catPostService.addComment(userId, postId.value, contentResult.value);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = positiveInt(req.params.id, "Post ID");
    if (postId.error) return response.badRequest(res, postId.error);
    
    const result = await catPostService.deletePost(userId, postId.value);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Delete post error:', error);
    if (error.message === 'Post not found') {
      res.status(404).json({ success: false, message: error.message });
    } else if (error.message === 'Unauthorized to delete this post') {
      res.status(403).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  toggleLike,
  addComment,
  deletePost,
};
