const catQAService = require('../services/catQAService');
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { positiveInt, requiredText } = require("../utils/validation");

class CatQAController {
  // Get all questions with answers
  async getAllQuestions(req, res) {
    try {
      const result = await catQAService.getAllQuestions(req.query.page, req.query.limit);
      res.status(200).json({
        success: true,
        data: result.questions,
        pagination: result.pagination,
        message: 'Questions retrieved successfully'
      });
    } catch (error) {
      logger.error('Error fetching questions:', error);
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

      const questionResult = requiredText(question, "Question content", { max: 1000 });
      if (questionResult.error) return response.badRequest(res, questionResult.error);

      const newQuestion = await catQAService.createQuestion({
        question: questionResult.value,
        userId
      });

      res.status(201).json({
        success: true,
        data: newQuestion,
        message: 'Question created successfully'
      });
    } catch (error) {
      logger.error('Error creating question:', error);
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
      const questionId = positiveInt(id, "Question ID");
      if (questionId.error) return response.badRequest(res, questionId.error);

      const question = await catQAService.getQuestionById(questionId.value);
      
      res.status(200).json({
        success: true,
        data: question,
        message: 'Question retrieved successfully'
      });
    } catch (error) {
      logger.error('Error fetching question:', error);
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

      const questionIdResult = positiveInt(questionId, "Question ID");
      if (questionIdResult.error) return response.badRequest(res, questionIdResult.error);
      const answerResult = requiredText(answer, "Answer content", { max: 2000 });
      if (answerResult.error) return response.badRequest(res, answerResult.error);

      const newAnswer = await catQAService.addAnswer({
        questionId: questionIdResult.value,
        answer: answerResult.value,
        userId
      });

      res.status(201).json({
        success: true,
        data: newAnswer,
        message: 'Answer added successfully'
      });
    } catch (error) {
      logger.error('Error adding answer:', error);
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
      const questionId = positiveInt(id, "Question ID");
      if (questionId.error) return response.badRequest(res, questionId.error);

      const result = await catQAService.deleteQuestion(questionId.value, userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting question:', error);
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
      const id = positiveInt(answerId, "Answer ID");
      if (id.error) return response.badRequest(res, id.error);

      const result = await catQAService.deleteAnswer(id.value, userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting answer:', error);
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
