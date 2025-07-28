import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api.js';

export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all posts for homepage feed
  const fetchAllPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.getAllPosts();
      if (response.success) {
        setPosts(response.data.posts || []);
      } else {
        setError(response.error || 'Failed to fetch posts');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's own posts
  const fetchMyPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.getMyPosts();
      if (response.success) {
        setPosts(response.data.posts || []);
      } else {
        setError(response.error || 'Failed to fetch your posts');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch your posts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new post
  const createPost = useCallback(async (postData) => {
    setError(null);
    try {
      const response = await ApiService.createPost(postData);
      if (response.success) {
        // Add the new post to the beginning of the posts array
        setPosts(prevPosts => [response.data.post, ...prevPosts]);
        return { success: true, post: response.data.post };
      } else {
        setError(response.error || 'Failed to create post');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to create post';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Delete a post
  const deletePost = useCallback(async (postId) => {
    setError(null);
    try {
      const response = await ApiService.deletePost(postId);
      if (response.success) {
        // Remove the post from the posts array
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
        return { success: true };
      } else {
        setError(response.error || 'Failed to delete post');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete post';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Toggle like on a post
  const toggleLike = useCallback(async (postId) => {
    setError(null);
    try {
      const response = await ApiService.toggleLike(postId);
      if (response.success) {
        // Update the post's like count in the posts array
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, likes: response.data.likesCount }
              : post
          )
        );
        return { 
          success: true, 
          liked: response.data.liked, 
          likesCount: response.data.likesCount 
        };
      } else {
        setError(response.error || 'Failed to toggle like');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to toggle like';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get posts by specific user ID
  const fetchPostsByUserId = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.getPostsByUserId(userId);
      if (response.success) {
        return { success: true, posts: response.data.posts || [] };
      } else {
        setError(response.error || 'Failed to fetch user posts');
        return { success: false, error: response.error, posts: [] };
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch user posts';
      setError(errorMessage);
      return { success: false, error: errorMessage, posts: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    posts,
    loading,
    error,
    fetchAllPosts,
    fetchMyPosts,
    fetchPostsByUserId,
    createPost,
    deletePost,
    toggleLike,
    clearError: () => setError(null)
  };
};
