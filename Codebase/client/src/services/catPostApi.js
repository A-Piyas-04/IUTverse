const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to create headers with auth
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// Create new cat post
export const createCatPost = async (formData) => {
  const token = getAuthToken();
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/cat-posts`, {
    method: 'POST',
    headers,
    body: formData, // FormData with image and caption
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create post');
  }
  
  return response.json();
};

// Get all cat posts
export const getCatPosts = async (page = 1, limit = 10) => {
  const response = await fetch(`${API_BASE_URL}/cat-posts?page=${page}&limit=${limit}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch posts');
  }
  
  return response.json();
};

// Get specific cat post by ID
export const getCatPostById = async (postId) => {
  const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch post');
  }
  
  return response.json();
};

// Toggle like on a post
export const toggleLike = async (postId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to toggle like');
  }
  
  return response.json();
};

// Add comment to a post
export const addComment = async (postId, content) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}/comment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to add comment');
  }
  
  return response.json();
};

// Delete a post
export const deleteCatPost = async (postId) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to delete post');
  }
  
  return response.json();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};