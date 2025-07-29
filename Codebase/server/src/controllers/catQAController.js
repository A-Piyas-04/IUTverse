const catQAService = require('../services/catQAService');

class CatQAController {
  // Get all questions with answers
  async getAllQuestions(req, res) {
    try {
      const questions = await catQAService.getAllQuestions();
      res.status(200).json({
        success: true,
        data: questions,
        message: 'Questions retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch questions'
      });
    }
  }

  // Create a new question
  async createQuestion(req, res) {
    try {
      const { question } = req.body;
      const userId = req.user?.id || null; // Get from auth middleware if available

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Question content is required'
        });
      }

      const newQuestion = await catQAService.createQuestion({
        question,
        userId
      });

      res.status(201).json({
        success: true,
        data: newQuestion,
        message: 'Question created successfully'
      });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create question'
      });
    }
  }

  // Get a specific question by ID
  async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await catQAService.getQuestionById(id);
      
      res.status(200).json({
        success: true,
        data: question,
        message: 'Question retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching question:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch question'
      });
    }
  }

  // Add an answer to a question
  async addAnswer(req, res) {
    try {
      const { id: questionId } = req.params;
      const { answer } = req.body;
      const userId = req.user?.id || null; // Get from auth middleware if available

      if (!answer || answer.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Answer content is required'
        });
      }

      const newAnswer = await catQAService.addAnswer({
        questionId,
        answer,
        userId
      });

      res.status(201).json({
        success: true,
        data: newAnswer,
        message: 'Answer added successfully'
      });
    } catch (error) {
      console.error('Error adding answer:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to add answer'
      });
    }
  }

  // Delete a question
  async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || null;

      const result = await catQAService.deleteQuestion(id, userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Unauthorized') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete question'
      });
    }
  }

  // Delete an answer
  async deleteAnswer(req, res) {
    try {
      const { answerId } = req.params;
      const userId = req.user?.id || null;

      const result = await catQAService.deleteAnswer(answerId, userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting answer:', error);
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('Unauthorized') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete answer'
      });
    }
  }
}

module.exports = new CatQAController();