const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { controller: lostAndFoundController, upload } = require('../controllers/lostAndFoundController');
const { imageUploadErrorHandler } = require("../middleware/uploadErrors");
const { createLimiter } = require("../middleware/security");
const { acceptStoredUpload } = require("../middleware/storedUpload");

// Public; signed-in members also see poster details
router.get('/', optionalAuth, lostAndFoundController.getAllPosts.bind(lostAndFoundController));

// Public; signed-in members also see poster details
router.get('/:postId', optionalAuth, lostAndFoundController.getPostById.bind(lostAndFoundController));

// Create a new lost and found post
router.post('/', 
  authenticateToken, 
  createLimiter,
  upload.single('image'), 
  imageUploadErrorHandler,
  acceptStoredUpload("lostFound"),
  lostAndFoundController.createPost.bind(lostAndFoundController)
);

// Update a lost and found post (protected, with file upload)
router.patch('/:postId', 
  authenticateToken, 
  createLimiter,
  upload.single('image'), 
  imageUploadErrorHandler,
  acceptStoredUpload("lostFound"),
  lostAndFoundController.updatePost.bind(lostAndFoundController)
);

// Delete a lost and found post (protected)
router.delete('/:postId', 
  authenticateToken, 
  lostAndFoundController.deletePost.bind(lostAndFoundController)
);

// Mark post as resolved (protected)
router.patch('/:postId/resolve', 
  authenticateToken, 
  lostAndFoundController.markAsResolved.bind(lostAndFoundController)
);

// Mark post as active (protected)
router.patch('/:postId/activate', 
  authenticateToken, 
  lostAndFoundController.markAsActive.bind(lostAndFoundController)
);

module.exports = router;
