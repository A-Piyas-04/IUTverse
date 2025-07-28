// API service for Lost and Found functionality

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || 'Something went wrong');
  }
  return response.json();
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Get all lost and found posts
export const getLostAndFoundPosts = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.type && filters.type !== 'all') {
      queryParams.append('type', filters.type);
    }
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    if (filters.status) {
      queryParams.append('status', filters.status);
    }
    
    const url = `${API_BASE_URL}/lost-and-found${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching lost and found posts:', error);
    throw error;
  }
};

// Create a new lost and found post
export const createLostAndFoundPost = async (postData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(postData)
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating lost and found post:', error);
    throw error;
  }
};

// Update a lost and found post (e.g., mark as resolved)
export const updateLostAndFoundPost = async (postId, updateData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating lost and found post:', error);
    throw error;
  }
};

// Delete a lost and found post
export const deleteLostAndFoundPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting lost and found post:', error);
    throw error;
  }
};

// Get a specific lost and found post by ID
export const getLostAndFoundPostById = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching lost and found post:', error);
    throw error;
  }
};

// Mark a post as resolved
export const markPostAsResolved = async (postId) => {
  return updateLostAndFoundPost(postId, { status: 'resolved' });
};

// Mark a post as active
export const markPostAsActive = async (postId) => {
  return updateLostAndFoundPost(postId, { status: 'active' });
};