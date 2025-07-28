const postsService = require('../services/postsService');

// Get all posts for homepage feed
const getAllPosts = async (req, res) => {
  try {
    const posts = await postsService.getAllPosts();
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get posts by user ID for profile page
const getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await postsService.getPostsByUserId(parseInt(userId));
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      message: 'Failed to fetch user posts',
      error: error.message
    });
  }
};

// Get posts for current authenticated user
const getCurrentUserPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const posts = await postsService.getPostsByUserId(userId);
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Error fetching current user posts:', error);
    res.status(500).json({
      message: 'Failed to fetch your posts',
      error: error.message
    });
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { content, category = 'general', isAnonymous = false } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        message: 'Post content is required'
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        message: 'Post content is too long (maximum 2000 characters)'
      });
    }

    const post = await postsService.createPost({
      userId,
      content: content.trim(),
      category,
      isAnonymous
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await postsService.getPostById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.userId !== userId) {
      return res.status(403).json({
        message: 'You can only delete your own posts'
      });
    }

    await postsService.deletePost(parseInt(postId));
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Like/unlike a post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const result = await postsService.togglePostReaction(
      parseInt(postId),
      userId,
      'like'
    );

    res.json({
      success: true,
      message: result.added ? 'Post liked' : 'Post unliked',
      liked: result.added,
      likesCount: result.likesCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// Get post reactions
const getPostReactions = async (req, res) => {
  try {
    const { postId } = req.params;
    const reactions = await postsService.getPostReactions(parseInt(postId));
    
    res.json({
      success: true,
      reactions
    });
  } catch (error) {
    console.error('Error fetching post reactions:', error);
    res.status(500).json({
      message: 'Failed to fetch post reactions',
      error: error.message
    });
  }
};

module.exports = {
  getAllPosts,
  getPostsByUserId,
  getCurrentUserPosts,
  createPost,
  deletePost,
  toggleLike,
  getPostReactions
};
