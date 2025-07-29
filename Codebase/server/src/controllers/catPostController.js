const catPostService = require('../services/catPostService');

const createPost = async (req, res) => {
  try {
    // Get userId from authenticated user, or null for anonymous posts
    const userId = req.user ? req.user.id : null;
    const { caption } = req.body;
    const image = req.file;
    
    if (!caption || !caption.trim()) {
      return res.status(400).json({ success: false, message: 'Caption is required' });
    }
    
    const post = await catPostService.createPost(userId, caption, image);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await catPostService.getAllPosts(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (!postId) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    
    const post = await catPostService.getPostById(postId);
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error('Get post error:', error);
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
    const postId = parseInt(req.params.id);
    
    if (!postId) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    
    const result = await catPostService.toggleLike(userId, postId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (!postId) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }
    
    const comment = await catPostService.addComment(userId, postId, content);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.id);
    
    if (!postId) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    
    const result = await catPostService.deletePost(userId, postId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Delete post error:', error);
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