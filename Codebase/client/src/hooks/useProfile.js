import { useState, useEffect } from 'react';
import ApiService from '../services/api.js';

export function useProfile() {
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ApiService.getProfile();
      
      if (response.success) {
        setProfileData(response.user);
        setUserPosts(response.posts || []);
      } else {
        setError(response.message || 'Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Error fetching profile data');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content) => {
    try {
      const response = await ApiService.createPost({ content });
      
      if (response.success) {
        // Add the new post to the beginning of the posts array
        setUserPosts(prevPosts => [response.data, ...prevPosts]);
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, message: 'Failed to create post' };
    }
  };

  const toggleLike = async (postId) => {
    try {
      const response = await ApiService.toggleLike(postId);
      
      if (response.success) {
        // Update the post in the local state
        setUserPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likesCount: response.data.likesCount,
                  isLikedByCurrentUser: response.data.isLiked 
                }
              : post
          )
        );
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, message: 'Failed to update like' };
    }
  };

  const deletePost = async (postId) => {
    try {
      const response = await ApiService.deletePost(postId);
      
      if (response.success) {
        // Remove the post from the local state
        setUserPosts(prevPosts => 
          prevPosts.filter(post => post.id !== postId)
        );
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, message: 'Failed to delete post' };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profileData,
    userPosts,
    loading,
    error,
    createPost,
    toggleLike,
    deletePost,
    refetch: fetchProfile
  };
}
