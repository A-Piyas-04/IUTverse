const express = require('express');
const router = express.Router();
const catQAController = require('../controllers/catQAController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication required for testing)
// Get all questions with answers
router.get('/questions', catQAController.getAllQuestions);

// Get a specific question by ID
router.get('/questions/:id', catQAController.getQuestionById);

// Create a new question (no auth required for testing)
router.post('/questions', (req, res, next) => {
  console.log('POST /questions route hit');
  console.log('Request body:', req.body);
  next();
}, catQAController.createQuestion);

// Add an answer to a question (no auth required for testing)
router.post('/questions/:id/answers', catQAController.addAnswer);

// Protected routes (authentication required)
// Delete a question
router.delete('/questions/:id', authenticateToken, catQAController.deleteQuestion);

// Delete an answer
router.delete('/answers/:answerId', authenticateToken, catQAController.deleteAnswer);

module.exports = router;