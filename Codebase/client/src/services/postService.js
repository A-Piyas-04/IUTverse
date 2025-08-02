import axios from "axios";
import { authUtils } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = authUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Posts Services
export const postService = {
  // Get all posts with pagination
  getPosts: async (page = 1, limit = 10, category = null) => {
    try {
      let url = `/posts?page=${page}&limit=${limit}`;
      if (category) {
        url += `&category=${category}`;
      }
      
      const response = await apiClient.get(url);
      console.log("Raw API response:", response);

      // Ensure we return an array, even if the API response structure is unexpected
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (
        response.data &&
        response.data.posts &&
        Array.isArray(response.data.posts)
      ) {
        return response.data.posts;
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      } else {
        console.error("API returned invalid posts data format:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }
  },

  // Get posts by category
  getPostsByCategory: async (category, page = 1, limit = 10) => {
    try {
      const response = await apiClient.get(
        `/posts?category=${category}&page=${page}&limit=${limit}`
      );
      console.log(`Posts for category ${category}:`, response);

      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (
        response.data &&
        response.data.posts &&
        Array.isArray(response.data.posts)
      ) {
        return response.data.posts;
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      } else {
        console.error("API returned invalid posts data format:", response.data);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching posts for category ${category}:`, error);
      // If category filtering fails, return empty array to avoid showing wrong posts
      return [];
    }
  },

  // Get single post by id with comments
  getPost: async (postId) => {
    try {
      const response = await apiClient.get(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create a new post
  createPost: async (postData) => {
    try {
      // For form data with image upload
      const formData = new FormData();

      // Add text fields
      formData.append("content", postData.content);
      formData.append("category", postData.category || "general");
      formData.append("isAnonymous", postData.isAnonymous || false);

      // Add image if present
      if (postData.image) {
        formData.append("image", postData.image);
      }

      console.log(
        "Sending post request with FormData:",
        Object.fromEntries(formData.entries())
      );
      const response = await axios.post(`${API_URL}/posts`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authUtils.getToken()}`,
        },
      });

      console.log("Create post response:", response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update a post
  updatePost: async (postId, postData) => {
    try {
      // For form data with image upload
      const formData = new FormData();

      // Add text fields
      formData.append("content", postData.content);
      formData.append("category", postData.category || "general");
      formData.append("isAnonymous", postData.isAnonymous || false);

      // Add image if present
      if (postData.image) {
        formData.append("image", postData.image);
      }

      const response = await axios.put(`${API_URL}/posts/${postId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authUtils.getToken()}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a post
  deletePost: async (postId) => {
    try {
      const response = await apiClient.delete(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Like/react to a post
  reactToPost: async (postId, reactionType) => {
    try {
      const response = await apiClient.post(`/posts/${postId}/react`, {
        reactionType,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user's personalized feed
  getUserFeed: async (page = 1, limit = 10) => {
    try {
      const response = await apiClient.get(`/feed?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get posts by user ID - tries direct endpoint first, falls back to filtering
  getUserPosts: async (userId, page = 1, limit = 100) => {
    try {
      console.log(`Fetching posts for user ID: ${userId}`);

      try {
        // First try to use the direct endpoint for user posts if it exists
        const response = await apiClient.get(
          `/users/${userId}/posts?page=${page}&limit=${limit}`
        );

        // Process the response from direct endpoint
        let userPosts;
        if (response.data && Array.isArray(response.data)) {
          userPosts = response.data;
        } else if (
          response.data &&
          response.data.posts &&
          Array.isArray(response.data.posts)
        ) {
          userPosts = response.data.posts;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          userPosts = response.data.data;
        } else {
          throw new Error("Invalid data format");
        }

        console.log(
          `Found ${userPosts.length} posts for user ${userId} using direct endpoint`
        );
        return userPosts;
      } catch (directEndpointError) {
        // If direct endpoint fails, fall back to getting all posts and filtering
        console.log(
          "Direct endpoint failed, falling back to filtering all posts",
          directEndpointError
        );

        // Get all posts with a higher limit to ensure we get enough user posts
        const response = await apiClient.get(
          `/posts?page=${page}&limit=${limit}`
        );

        // Get the posts array
        let allPosts;
        if (response.data && Array.isArray(response.data)) {
          allPosts = response.data;
        } else if (
          response.data &&
          response.data.posts &&
          Array.isArray(response.data.posts)
        ) {
          allPosts = response.data.posts;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          allPosts = response.data.data;
        } else {
          console.error(
            "API returned invalid posts data format:",
            response.data
          );
          return [];
        }

        // Filter posts for the specific user
        const userPosts = allPosts.filter(
          (post) =>
            post.userId === userId ||
            (post.user && post.user.id === userId) ||
            (post.user &&
              post.user.id &&
              post.user.id.toString() === userId.toString())
        );

        console.log(
          `Found ${userPosts.length} posts for user ${userId} using filtering method`
        );
        return userPosts;
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      return [];
    }
  },
};

// Comment Services
export const commentService = {
  // Get comments for a post
  getPostComments: async (postId, page = 1, limit = 20) => {
    try {
      console.log("Fetching comments for post:", postId);
      const response = await apiClient.get(
        `/posts/${postId}/comments?page=${page}&limit=${limit}`
      );
      console.log("Raw API comments response:", response);

      // Ensure we return an array of comments, even if the API response structure is unexpected
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (
        response.data &&
        response.data.comments &&
        Array.isArray(response.data.comments)
      ) {
        return response.data.comments;
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      } else {
        console.error(
          "API returned invalid comments data format:",
          response.data
        );
        return [];
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  },

  // Add a comment to a post
  addComment: async (postId, content, parentCommentId = null) => {
    try {
      const response = await apiClient.post(`/posts/${postId}/comments`, {
        content,
        parentCommentId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get replies for a comment
  getCommentReplies: async (commentId) => {
    try {
      const response = await apiClient.get(`/comments/${commentId}/replies`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update a comment
  updateComment: async (commentId, content) => {
    try {
      const response = await apiClient.put(`/comments/${commentId}`, {
        content,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete a comment
  deleteComment: async (commentId) => {
    try {
      const response = await apiClient.delete(`/comments/${commentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
