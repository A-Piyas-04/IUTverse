// API service for Cat Post functionality

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    console.error('API Error Status:', response.status);
    console.error('API Error StatusText:', response.statusText);
    
    try {
      const errorData = await response.json();
      console.error('API Error Details:', errorData);
      throw new Error(errorData.message || 'Something went wrong');
    } catch (parseError) {
      console.error('Error parsing error response:', parseError);
      throw new Error('Network error or invalid response');
    }
  }
  
  try {
    const data = await response.json();
    console.log('API Success Response:', data);
    
    // Always return the data property if it exists, otherwise return the full response
    if (data && typeof data === 'object' && 'data' in data) {
      console.log('API - Returning data.data from response:', data.data);
      return data.data;
    } else {
      console.log('API - Returning full data object from response:', data);
      return data;
    }
  } catch (parseError) {
    console.error('Error parsing success response:', parseError);
    throw new Error('Invalid response format');
  }
};

// Helper function to get auth headers
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('iutverse_auth_token');
  const headers = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  // Note: For FormData, we don't set Content-Type as the browser will set it automatically with the boundary
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('API - Using auth token:', `Bearer ${token.substring(0, 10)}...`);
  } else {
    console.log('API - No auth token found in localStorage');
  }
  
  console.log('API - Headers being sent:', headers);
  return headers;
};

// Get all cat posts
export const getCatPosts = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    
    const url = `${API_BASE_URL}/cat-posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cat posts:', error);
    throw error;
  }
};

// Create a new cat post
export const createCatPost = async (postData) => {
  try {
    console.log('API - Creating cat post with data:', postData);
    
    const formData = new FormData();
    formData.append('caption', postData.caption);
    
    if (postData.image) {
      formData.append('image', postData.image);
    }
    
    console.log('API - FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const headers = getAuthHeaders(true); // true for FormData
    
    console.log('API - Making request to:', `${API_BASE_URL}/cat-posts`);
    
    const response = await fetch(`${API_BASE_URL}/cat-posts`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    console.log('API - Response status:', response.status);
    console.log('API - Response ok:', response.ok);
    console.log('API - Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Try to get response text for debugging
    const responseText = await response.text();
    console.log('API - Response text:', responseText);
    
    // Parse response if it's JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('API - Failed to parse response as JSON:', parseError);
      throw new Error(`Server returned non-JSON response: ${responseText}`);
    }
    
    if (!response.ok) {
      throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('API - Error creating cat post:', error);
    console.error('API - Error message:', error.message);
    console.error('API - Error stack:', error.stack);
    
    // Re-throw with more context
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
    }
    
    throw error;
  }
};

// Get a specific cat post by ID
export const getCatPostById = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cat post:', error);
    throw error;
  }
};

// Like/unlike a cat post
export const toggleLikeCatPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error toggling like on cat post:', error);
    throw error;
  }
};

// Add a comment to a cat post
export const addCommentToCatPost = async (postId, commentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error adding comment to cat post:', error);
    throw error;
  }
};

// Get comments for a cat post
export const getCatPostComments = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}/comments`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cat post comments:', error);
    throw error;
  }
};

// Delete a cat post (only by the author)
export const deleteCatPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cat-posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting cat post:', error);
    throw error;
  }
};