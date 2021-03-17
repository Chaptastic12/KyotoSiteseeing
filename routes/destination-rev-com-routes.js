const express = require('express'),
      middleware = require("../middleware/index"),
      { check } = require ('express-validator'),
      destinationReviewControllers = require('../controllers/destination-review-controllers'),
      destinationCommentControllers = require('../controllers/destination-comment-controllers'),
      destinationLikeControllers = require('../controllers/destination-like-controller');

//Need the router method specifically so we can export and import into app.js
const router = express.Router();

router.get('/:id/reviews/', destinationReviewControllers.showAllReviews);

router.post('/:id/reviews/', middleware.checkReviewExistence, destinationReviewControllers.addNewReview);

router.get('/:id/reviews/:review_id/edit', middleware.checkReviewOwnership, destinationReviewControllers.editExistingReview);

router.put('/:id/reviews/:review_id', middleware.checkReviewOwnership, destinationReviewControllers.updateExistingReview);

router.delete('/:id/reviews/:review_id', middleware.checkReviewOwnership, destinationReviewControllers.deleteExistingReview);

// As the UI for posting comments is embedded in the destination view page, there are no API routes for that

router.post('/:id/comments/', middleware.isLoggedIn , destinationCommentControllers.postCommentLogic);

router.put('/:id/comments/:comment_id', middleware.checkCommentOwnership , destinationCommentControllers.updateCommentLogic);

router.delete('/:id/comments/:comment_id', middleware.checkCommentOwnership , destinationCommentControllers.deleteCommentLogic);

//Routes for Likes

router.post('/:id/like', middleware.isLoggedIn, destinationLikeControllers.likeDestinationLogic);

module.exports = router;