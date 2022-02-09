//Initialize 'express' and 'app' so that we can properly set up other dependencies
const express = require('express'),
      Destination = require('../models/destinations'),
      User = require('../models/user'),
      flash = require('connect-flash'),
      app = express();

//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Necessary for the error/success messages
app.use( flash() );

const likeDestinationLogic = (req, res, next) =>{
    Destination.findById(req.params.id, (err, foundDestination) =>{
		if(err){
			req.flash("error", err.message);
			req.redirect("back");
		} else{
			User.findById(req.user._id, (err, likeUser) =>{
				//Check if the currently logged in user has already liked this destinations
				let foundUser = foundDestination.likes.some((like) =>{
					return like.equals(req.user._id);
				});

				//Some will return TRUE if one does exist. Which means we need to unlike the destination
				if(foundUser){
					//Remove the destination from the Destiantions like list
					foundDestination.likes.pull(req.user._id);
					//Remove destination from the Users like list
					likeUser.likes.pull(req.params.id);
				} else {
					//if some() returns FALSE then this is a new like
					foundDestination.likes.push(req.user._id);
					likeUser.likes.push(req.params.id);
				}
				//Save the user and the destination.
				likeUser.save();
				foundDestination.save((err) =>{
					if(err){
						req.flash("error", err.message);
						return res.redirect("back");
					}
					return res.redirect("back");
				});
			});
		}
	});
};

exports.likeDestinationLogic = likeDestinationLogic;