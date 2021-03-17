//Initialize 'express' and 'app' so that we can properly set up other dependencies
const express = require('express'),
      Destination = require('../models/destinations'),
      Review = require('../models/review'),
      flash = require('connect-flash'),
      app = express();

//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Necessary for the error/success messages
app.use( flash() );

const calculateAverage = (reviews) =>{
	//If there are no reviews, then we want to return a 0 instead of null or undefined
	if(reviews.length === 0 ){
		return 0;
	}
	let sum = 0;
	reviews.forEach((reviews) =>{
		sum += reviews.rating;
	});
	return sum / reviews.length;
}

const showAllReviews = (req, res, next) =>{
    Destination.findById(req.params.id).populate("reviews").exec((err, foundDestination) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("destinations/reviews", {destination: foundDestination});
		}
	});
}

const addNewReview = (req, res, next) =>{
    Destination.findById(req.params.id).populate("reviews").exec((err, foundDestination) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Review.create(req.body.review, (err, newReview) =>{
				if(err){
					req.flash("error", err.message);
					res.redirect("/destinations/view/" + req.params.id)
				} else {
					//Add in the author info as well as the destination it is for
					newReview.author.id = req.user._id;
					newReview.author.username = req.user.username;
					newReview.destination = foundDestination;
					//Save our reviews
					newReview.save();
					foundDestination.reviews.push(newReview);
					//Calculate our destinations average
					foundDestination.rating = calculateAverage(foundDestination.reviews);
					foundDestination.save();
					req.flash("success", "Review successfully added");
					res.redirect("/destinations/view/" + req.params.id);
				}
			});
		}
	});
}

const editExistingReview = (req, res, next) =>{
    Review.findById(req.params.review_id, (err, foundReview) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("reviews/edit", {review: foundReview, destination: req.params.id});
		}
	})
}

const updateExistingReview = (req, res, next) =>{
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, (err, updatedReview) =>{
		if(err){
			req.flash("error", "Error updating your review.");
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Destination.findById(req.params.id).populate("reviews").exec((err, foundDestination) =>{
				if(err){
					req.flash("error", "Error updating your review.");
					return res.redirect("/destinations/view/" + req.params.id);
				} else {
					//calculate updated average
					foundDestination.rating = calculateAverage(foundDestination.reviews);
					foundDestination.save();
					req.flash("success", "Review successfully updated");
					res.redirect("/destinations/view/" + req.params.id);
				}
			})
		}
	});
}

const deleteExistingReview = (req, res, next) =>{
    Review.findById(req.params.review_id, (err) =>{
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Destination.findById(req.params.id, {$pull: {reviews: req.params.review_id}}, {new:true}.populate("reviews").exec((err, foundDestination) =>{
			if(err){
				req.flash("error", err.message);
				return res.redirect("back");
			}
			//recalculate the average
			foundDestination.rating = calculateAverage(foundDestination.reviews);
			//resave the average
			foundDestination.save();
			req.flash("success", "Your review has been deleted successfully");
			res.redirect("/destinations/view/" + req.params.id);
		}));
	});
}


exports.showAllReviews = showAllReviews;
exports.addNewReview = addNewReview;
exports.editExistingReview = editExistingReview;
exports.updateExistingReview = updateExistingReview;
exports.deleteExistingReview = deleteExistingReview;