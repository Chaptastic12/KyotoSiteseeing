const Destination = require("../models/destinations"),
	  Comment    = require("../models/comments"),
	  Review 	 = require("../models/review"),
	  User		 = require("../models/user");

//==========================================
// MIDDLEWARE
//==========================================

let middlewareObj = {};

//If you are logged in and shouldn't go to the page...OR
//You are not logged in and should go to the page
middlewareObj.alreadyLoggedIn = function(req, res, next){
	if(req.user){
		req.flash("error", "You are already logged in!");
		return res.redirect("/");
	}
	next();
};

//If you are logged in and should go to a page OR
//If you are not logged in shouldn't go to the page
middlewareObj.isLoggedIn = function(req, res, next){
	if(req.user){
		return next()
	}
	req.flash("error", "You must be logged in to perform that action");
	res.redirect("back");
};

//check to see if you own the Destination you are attempting to edit/ delete
middlewareObj.ownsDestination = function(req, res, next){
	//Check that they are logged in
	if(req.isAuthenticated()){
		//If they are logged in, find the destination
		Destination.findById(req.params.id, function(err, foundDestination){
			if(err || !foundDestination){
				req.flash("error", err.message);
				req.redirect("back");
			} else {
				//Check that they own the destination
				if(foundDestination.author.id.equals(req.user.id) || req.user.isAdmin){
					//if they do, continue
					return next();
				} else {
					//If not, send them back a page
					req.flash("error", "You do not own this Destination");
					res.redirect("back");
				}
			}
		});
	} else {
		//If they are not logged in, kick them back to the landing page
		req.flash("error", "You must be logged in to perform this action");
		res.redirect("back");
	}
}
//Check to see if you own a comment you are attempting to edit/ delete
middlewareObj.checkCommentOwnership = function(req, res, next){
	//Check if they are logged in
	if(req.isAuthenticated){
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment){
				req.flash("error", err.message);
				req.redirect("back");
			} else {
				//Check if they own the comment or are an admin user
				if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
			  		req.comment = foundComment;
					next();
			   } else {
				   req.flash("error", "You do not have permissions to edit this");
				   res.redirect("back");
			   }
			}
		})
	} else {
		req.flash("error", "You must be logged in to perform this action");
		res.redirect("back");
	}
}

//Check to see if you own a review you are attempting to edit/ delete
middlewareObj.checkReviewOwnership = function(req, res, next){
	if(req.isAuthenticated){
		Review.findById(req.params.review_id, function(err, foundReview){
			if(err || !foundReview){
				req.flash("error", err.message);
				res.redirect("back");
			} else{
				if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin){
					req.review = foundReview;
					next();
				} else {
					req.flash("error", "You do not have permission to edit this");
					res.redirect("back");
				}
			}
		});
	} else{
		req.flash("error", "You must be logged in to perform this action");
		res.redirect("back");
	}
}

//Check if a user has already submitted a review or not
middlewareObj.checkReviewExistence = function(req, res, next){
	if(req.isAuthenticated()){ // verify that they are logged in
		console.log(req.params);
		Destination.findById(req.params.id).populate("reviews").exec(function(err, foundDestination){ //find the destination with req.params.id, populate its reviews and execute the function
			if(err || !foundDestination){ //if theres an error or we didn't find a destination with that Id, show an error message
				req.flash("error", 'there was an error processing your request');
				console.log(foundDestination);
				res.redirect("back");
			} else {
				console.log(foundDestination.reviews);
				let foundUserReview = foundDestination.reviews.some(function(review){ //if we did find a destination, see if a review can be found where any of the reviews has an author id of the logged in user. Some() will return true or false
					return review.author.id.equals(req.user._id);
				});
				if(foundUserReview){ //if it finds one, throw an error
					req.flash("error", "You already wrote a review");
					return res.redirect("/destinations/view/" + req.params.id);
				}
				//else if a review wasn't found...
				next();
			}
		});
	}
}

//Check if a user is an administrator or not
middlewareObj.checkAdminPriveleges = function(req, res, next){
	//verify someone is logged in
	if(req.isAuthenticated()){
	   if(req.user.isAdmin){
		next()
		}
		else {
			req.flash("error", "You do not have the required permissions");
			res.redirect("/");
		}
	}
	else {
		req.flash("error", "You must be logged in first");
		res.redirect("/")
	}
}

middlewareObj.logInUser = function(req, res, next){
	
}


module.exports = middlewareObj;