const API_BASE_URL = 'http://localhost:3000/api/cat-qa';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to get headers with auth (for protected routes)
const getHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function to get headers without auth (for public routes)
const getPublicHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Get all questions with answers
export const getAllQuestions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: 'GET',
      headers: getPublicHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch questions');
    }

    return {
      success: true,
      questions: data.data || []
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create a new question
export const createQuestion = async (questionText) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: getPublicHeaders(),
      body: JSON.stringify({
        question: questionText
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create question');
    }

    return {
      success: true,
      question: data.data
    };
  } catch (error) {
    console.error('Error creating question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get a specific question by ID
export const getQuestionById = async (questionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'GET',
      headers: getPublicHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch question');
    }

    return {
      success: true,
      question: data.data
    };
  } catch (error) {
    console.error('Error fetching question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add an answer to a question
export const addAnswer = async (questionId, answerText) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}/answers`, {
      method: 'POST',
      headers: getPublicHeaders(),
      body: JSON.stringify({
        answer: answerText
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add answer');
    }

    return {
      success: true,
      answer: data.data
    };
  } catch (error) {
    console.error('Error adding answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete a question
export const deleteQuestion = async (questionId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete question');
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    console.error('Error deleting question:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete an answer
export const deleteAnswer = async (answerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/answers/${answerId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete answer');
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    console.error('Error deleting answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
};