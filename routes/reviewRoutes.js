const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// POST a new review for a business
router.post('/:businessId', reviewController.createReview);

// GET all reviews for a business
router.get('/:businessId', reviewController.getReviews);

// POST a reply to a review
router.post('/:reviewId/reply', reviewController.createReply);

module.exports = router;
