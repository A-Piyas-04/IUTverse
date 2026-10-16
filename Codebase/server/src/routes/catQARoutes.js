const express = require('express');
const router = express.Router();
const catQAController = require('../controllers/catQAController');
const { authenticateToken } = require('../middleware/auth');
const { createLimiter } = require("../middleware/security");

// Members only
router.get('/questions', authenticateToken, catQAController.getAllQuestions);

router.get('/questions/:id', authenticateToken, catQAController.getQuestionById);

router.post('/questions', authenticateToken, createLimiter, catQAController.createQuestion);

router.post('/questions/:id/answers', authenticateToken, createLimiter, catQAController.addAnswer);

// Protected routes (authentication required)
// Delete a question
router.delete('/questions/:id', authenticateToken, catQAController.deleteQuestion);

// Delete an answer
router.delete('/answers/:answerId', authenticateToken, catQAController.deleteAnswer);

module.exports = router;
