//Initialize 'express' and 'app' so that we can properly set up other dependencies
const express = require('express'),
      Destination = require('../models/destinations'),
      Comment = require('../models/comments'),
      flash = require('connect-flash'),
      app = express();

//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Necessary for the error/success messages
app.use( flash() );

//Handle the logic for posting a comment
const postCommentLogic = (req, res) =>{
	Destination.findById(req.params.id, (err, foundDestination) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Comment.create(req.body.comment, (err, newComment) =>{
				if(err){
					req.flash("error", err.message);
				} else {
					//Add in the username and the author id to our comment
					newComment.author.id = req.user._id;
					newComment.author.username = req.user.username;
					//Save the comment
					newComment.save();
					//Push that into our destiantion
					foundDestination.comments.push(newComment);
					foundDestination.save();
					//Redirect them back to the page
					req.flash("success", "Comment successfully posted");
					res.redirect("/destinations/view/" + req.params.id);
				}
			});
		}
	});
};

//Handle the logic for editing a comment that you own
const updateCommentLogic = (req, res) =>{
	//If we make it through the middleware, find the comment using the :comment_id variable and pass in the new info from the body.
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, foundComment) =>{
		if(err){
			req.flash("error", "Error updating comment");
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			req.flash("success", "Comment was updated successfully");
			res.redirect("/destinations/view/" + req.params.id);
		}
	});
};

//Handle the logic of deleting a comment, assuming that you own it that is
const deleteCommentLogic = (req, res) =>{
	Comment.findByIdAndRemove(req.params.comment_id, (err, foundComment) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			req.flash("success", "Comment was deleted successfully");
			res.redirect("/destinations/view/" + req.params.id);
		}
	});
};

exports.postCommentLogic = postCommentLogic;
exports.updateCommentLogic = updateCommentLogic;
exports.deleteCommentLogic = deleteCommentLogic;