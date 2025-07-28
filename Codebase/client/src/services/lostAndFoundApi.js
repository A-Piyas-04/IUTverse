// API service for Lost and Found functionality

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
  const token = localStorage.getItem('authToken');
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
    console.log('API - createLostAndFoundPost called with:', postData);
    
    // Check if postData is already FormData
    let formDataToSend;
    if (postData instanceof FormData) {
      console.log('API - postData is already FormData');
      formDataToSend = postData;
      
      // Log FormData contents for debugging
      console.log('API - FormData entries:');
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? 
          `File: ${pair[1].name} (${pair[1].size} bytes)` : pair[1]));
      }
    } else {
      console.log('API - Converting postData to FormData');
      formDataToSend = new FormData();
      
      // Add all text fields to FormData
      Object.keys(postData).forEach(key => {
        if (key !== 'image' && postData[key] !== undefined && postData[key] !== null) {
          formDataToSend.append(key, postData[key]);
          console.log(`API - Added ${key}: ${postData[key]} to FormData`);
        }
      });
      
      // Add image file if present
      if (postData.image && postData.image instanceof File) {
        formDataToSend.append('image', postData.image);
        console.log(`API - Added image: ${postData.image.name} (${postData.image.size} bytes) to FormData`);
      }
    }
    
    console.log('API - Sending request to:', `${API_BASE_URL}/lost-and-found`);
    const response = await fetch(`${API_BASE_URL}/lost-and-found`, {
      method: 'POST',
      headers: getAuthHeaders(true), // true indicates FormData
      body: formDataToSend
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
    const formData = new FormData();
    
    // Add all text fields to FormData
    Object.keys(updateData).forEach(key => {
      if (key !== 'image' && updateData[key] !== undefined && updateData[key] !== null) {
        formData.append(key, updateData[key]);
      }
    });
    
    // Add image file if present
    if (updateData.image && updateData.image instanceof File) {
      formData.append('image', updateData.image);
    }
    
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true), // true indicates FormData
      body: formData
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
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}/resolve`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error marking post as resolved:', error);
    throw error;
  }
};

// Mark a post as active
export const markPostAsActive = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lost-and-found/${postId}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error marking post as active:', error);
    throw error;
  }
};