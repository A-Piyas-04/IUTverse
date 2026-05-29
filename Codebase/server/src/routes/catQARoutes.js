const express = require('express');
const router = express.Router();
const catQAController = require('../controllers/catQAController');
const { authenticateToken } = require('../middleware/auth');
const { createLimiter } = require("../middleware/security");

// Get all questions with answers
router.get('/questions', catQAController.getAllQuestions);

// Get a specific question by ID
router.get('/questions/:id', catQAController.getQuestionById);

router.post('/questions', authenticateToken, createLimiter, catQAController.createQuestion);

router.post('/questions/:id/answers', authenticateToken, createLimiter, catQAController.addAnswer);

// Protected routes (authentication required)
// Delete a question
router.delete('/questions/:id', authenticateToken, catQAController.deleteQuestion);

// Delete an answer
router.delete('/answers/:answerId', authenticateToken, catQAController.deleteAnswer);

module.exports = router;
