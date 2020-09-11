//====================================
//ALL APP CONFIGURATION
//====================================

//Require all of our packages
const express = require("express"),
	  app 	  = express(),
	  router = express.Router(),
	  mongoose = require("mongoose"),
	  bodyParser = require("body-parser"),
	  methodOverride = require("method-override"),
	  flash			 = require("connect-flash"),
	  User 	  = require("./models/user"),
	  Comment = require("./models/comments"),
	  Destination = require("./models/destinations"),
	  Review = require("./models/review"),
	  middleware = require("./middleware/index"),
	  passport	 	 = require("passport"),
	  LocalStrategy  = require("passport-local"),
	  aSync	   = require("async"),
	  nodemailer = require("nodemailer"),
	  crypto   	 = require("crypto"),
	  dotenv = require("dotenv");


require('dotenv').config();

//Initialize moment js to be used across all pages
app.locals.moment = require("moment");

//Gotta have this for bodyParser to work
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json()); //support json encoded bodies

//Serve the public directory
app.use(express.static(__dirname + "/public"));

//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Setup our DB and resolve depreciation errors
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });

//Necessary for the error/success messages
app.use(flash());


//Passport Configuration
app.use(require("express-session")({
	secret: process.env.PASSPORT_KEY,
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//add currentUser to all our templates - add the flash messages to all pages as well
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success= req.flash("success");
	next();
})

app.use(methodOverride("_method"));

//==========================
// ROUTES
//==========================

//Show the main landing Page
app.get("/", function(req, res){
	res.render("landing");
})

//==========================
//REGISTRATION ROUTES
//==========================

//Show the Register Page
app.get("/register", middleware.alreadyLoggedIn, function(req, res){
	res.render("register");
})

//Handle our registeration logic
app.post("/register", function(req, res){
	//create our newUser object
	let newUser = new User({
		username: req.body.username,
		email: req.body.email
	});
	
	//make sure the passwords entered in match
	if(req.body.password === req.body.confirmPassword){
		
		//Check if they know the SecretCode - remove after creating first Admin account
		if(req.body.secretCode === process.env.ADMIN_CODE){
			newUser.isAdmin = true;
		}
		
		//use the .register from local passport to create the user. pass in the password which .register will hash for us
		User.register(newUser, req.body.password, function(err, user){
			if(err){
				//If we run into an error, return the error and redirect back the register page
				req.flash("error", err.message);
				return res.redirect("/register");
			} //don't need an 'else' because the return breaks us out if it fails
			//Authenticate them and log them in
			passport.authenticate("local")(req, res, function(){
				//If there is no error, welcome them and send them back to the landing page
				req.flash("success", "Welcome, " + req.body.username);
				res.redirect("/");
			});
		});
	} else {
		//If password =/= confirm password, alert them and then redirect them back to the register page
		req.flash("error", "Your passwords do not match");
		res.redirect("/register");
	}
	
});

//==========================
//LOGIN & OUT ROUTES
//==========================

//Show the Login Page
app.get("/login", middleware.alreadyLoggedIn, function(req, res){
	res.render("login");
})

//Handle the login logic - use passport.authenticate middleware to handle all the work for us. 
//Set what happens if it fails or succeeds. Requires a username and password
app.post("/login", passport.authenticate("local", {
	successRedirect: "back",
	failureRedirect: "/login"
}), function(req, res){});
		 
//Handle the logout logic
app.get("/logout", function(req, res){
	req.logout();
	req.flash("succes", "Successfully logged you out.");
	res.redirect("/");
})

//=========================
//USER PROFILE ROUTES
//=========================
//Add logic to ensure you can only see your own user page and no one elses. req.user._id === req.params.id
app.get("/user/:id", middleware.isLoggedIn, function(req, res){
	User.findById(req.params.id).populate("likes").exec(function(err, foundUser){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("users/", {user: foundUser});
		}
	})
})

//=========================
//DESTINATION ROUTES
//=========================

//Show our main index page that will list all of the destinations
app.get("/destinations", function(req, res){
	const perPage = 2; // Max number of items per page
	const pageQuery = parseInt(req.query.page); //get the page number from the query
	let pageNumber = pageQuery ? pageQuery : 1; //Current page number
	//The search is trickier, since we already have a query with other info in it...
	//To combat this, grab the last character. This will be the page number, or a character
	//Use parseInt() to verify that it is a number. Otherwise, it'll return NaN
	const searchPageQuery = req.query.search ? parseInt((req.query.search).slice(-1)) : 1;
	//If it returns NaN, we know we are on page 1, as that is the only time it won't have a number at the end.
	let searchPageNumber = searchPageQuery ? searchPageQuery : 1;


	//Check if we passed in a search - if we did, render that. If not, render all destinations
	if(req.query.search){
		//Tricky due to our pagination - it adds a bunch of stuff to our search term. We need to clean that up.
		//Find the index where the first ? is.
		const n = req.query.search.indexOf('?');
		//Create a substring of everything that is then BEFORE that first ?
		const spliceSearch = req.query.search.substring(0, n!=-1 ? n: req.query.search.length);
		//Put it into the RegExp() so we are effectively searching the right term again
		const regex = new RegExp(escapeRegex(spliceSearch), 'gi');
		//If wanting to expand in the future, use Destination.find({$or: [{name: regex},{description: regex}]}, function
		Destination.find({name: regex}).skip((perPage * searchPageNumber) - perPage).limit(perPage).exec(function(err, foundDestination){
			Destination.countDocuments({name:regex}).exec(function(err, count){ //count how many destinations we have
				if(err){
					req.flash("error", err.message);
					res.redirect("/landing");
				} else {
					//If no error, check if any results were found
					if(foundDestination.length === 0){
						req.flash("error", "No search results were found " + req.query.search);
						res.redirect("back");
					} else {
						res.render("destinations/", {destination: foundDestination, count: count, id:"?search="+req.query.search, title: "your search results", search: req.query.search, current: searchPageNumber, pages: Math.ceil(count / perPage)});
					}
				}
			});
		});
	} else { //If not a search, just load all of the destinations
		Destination.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, foundDestination){
			Destination.countDocuments({}).exec(function(err, count){ //count how manmy destinations we have
				if(err){
					req.flash("error", err.message);
					 res.redirect("/landing");
				} else {
					res.render("destinations/", {destination: foundDestination, count: count, id: "/", title: "view All Destinations", current: pageNumber, pages: Math.ceil(count / perPage)})
				}
			});
		});
	}
});


//Show all our Seasonal destinations
app.get("/destinations/seasonal", function(req, res){
	const perPage = 2; // Max number of items per page
	const pageQuery = parseInt(req.query.page); //get the page number from the query
	let pageNumber = pageQuery ? pageQuery : 1; //Current page number
	
	Destination.find({season: {$in: ["fall", "spring", "winter", "summer"]}}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, foundDestination){
		Destination.countDocuments({season: {$in: ["fall", "spring", "winter", "summer"]}}).exec(function(err, count){ //count how manmy destinations we have
			if(err){
				req.flash("error", err.message);
				res.redirect("/");
			} else {
				res.render("destinations/seasonal", {destination: foundDestination, season: null, current: pageNumber, pages: Math.ceil(count / perPage), count:count});
			}
		});
	});
});

//If they request a specific season...
app.get("/destinations/seasonal/:id", function(req, res){
	const perPage = 2; // Max number of items per page
	const pageQuery = parseInt(req.query.page); //get the page number from the query
	let pageNumber = pageQuery ? pageQuery : 1; //Current page number
	
	if(req.params.id === null){
		res.redirect("/destinations/seasonal");
	}else {
		Destination.find({season: req.params.id}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, foundDestination){
			Destination.countDocuments({season: req.params.id}).exec(function(err, count){ //count how manmy destinations we have
				if(err){
					req.flash("error", err.message);
					res.redirect("/");
				} else {
					res.render("destinations/seasonal", {destination: foundDestination, season: req.params.id, current: pageNumber, pages: Math.ceil(count / perPage), count:count});
				}
			});
		});
	}
})

//=====================================
//SHOW THE DETAILS OF A DESTINATION
//=====================================
app.get("/destinations/view/:id", function(req, res){
	//Populate with the comments, likes, and reviews for this specific destination.
	Destination.findById(req.params.id).populate("comments").populate("likes").populate({path: "reviews", options: {sort: {createdAt: -1}}}).exec(function(err, foundDestination){
		if(err || !foundDestination){
			req.flash("error", "Error viewing destination");
			res.redirect("/destinations");
		} else {
			res.render("destinations/view", {destination: foundDestination});
		}
	});
})

//======================================
//DESTINATION CREATION/EDITING/DELETION
//======================================

//Show the form for adding a new destinations. Can't access unless logged in
app.get("/destinations/new", middleware.isLoggedIn, function(req, res){
	res.render("destinations/new");
});

//Handle the logic for adding a new destination.  Can't access unless logged in
app.post("/destinations/new", middleware.isLoggedIn, function(req, res){
	//We currently only accept things in Kyoto, so define the prefectures there
	req.body.destination.prefecture = "Kyoto Prefecture";

	//Create the new destination using the 'destiantion' object received from the form
	Destination.create(req.body.destination, function(err, newDestination){
		if(err){
			//If there is an error, pass that error along
			req.flash("error", err.message);
			return res.redirect("/destinations/new");
		}
		newDestination.author.username = req.user.username;
		newDestination.author.id = req.user._id;
		newDestination.save();
		//If no error, send them to their previous page
		req.flash("success", "Destiantion successfully added!");
		res.redirect("/destinations");
	});
});

//Show the edit page for editing a destiantion. need to own the destination.
app.get("/destinations/:id/edit", middleware.ownsDestination, function(req, res){
	Destination.findById(req.params.id, function(err, foundDestination){
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/");
		}
		res.render("destinations/edit", {destination: foundDestination});
	});
});

//Handle the logic for the update page. need to own the destination
app.put("/destinations/:id", middleware.ownsDestination, function(req, res){
	//Find the destination using params.id. In order to prevent likes and else from being overwritte, specify what is being updated and proceed
	Destination.findById(req.params.id, function(err, updatedDestination){
		if(err){
			//If error, let them know and redirect back
			req.flash("error", err.message);
			res.redirect("/destinations/");
		} else {
			updatedDestination.name = req.body.destination.name;
			updatedDestination.description = req.body.destination.description;
			updatedDestination.image = req.body.destination.image;
			updatedDestination.typeOf = req.body.destination.typeOf;
			updatedDestination.cost = req.body.destination.cost;
			updatedDestination.season = req.body.destination.season;
			updatedDestination.address = req.body.destination.address;
			updatedDestination.save(function(err){
									if(err){
										req.flash("error", err.message);
										res.redirect("back");
									} else {
									//If no error, we did it!
									req.flash("success", "Destination was successfully updated");
									res.redirect("/destinations/view/" + req.params.id);
									}
								});
		}
	});
});
//Handle the logic for deleting a destination. Need to be own the destination
app.delete("/destinations/:id", middleware.ownsDestination, function(req, res){
	//Find the id sent and remove it
	Destination.findByIdAndRemove(req.params.id, function(err, deleteDestination){
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations");
		} else {
			//delete all comments associated
			Comment.remove({_id: {$in: deleteDestination.comments}}, function(err){
				if(err){
					req.flash("error", err.message);
					res.redirect("/destinations");
				}
				Destination.remove();
				req.flash("success", "Successfully deleted " + deleteDestination.name);
				res.redirect("/destinations/");
			});
		}
	});
});
//=========================
//COMMENT ROUTES
//=========================

//Handle the logic for posting a comment
app.post("/destinations/view/:id/comments", middleware.isLoggedIn, function(req, res){
	Destination.findById(req.params.id, function(err, foundDestination){
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Comment.create(req.body.comment, function(err, newComment){
				if(err){
					req.flash("error", err.message);
				} else {
					//Add in the username and the author id to our comment
					newComment.author.id = req.user._id;
					newComment.author.username = req.user.username;
					//Save the comment
					newComment.save();
					console.log(newComment);
					//Push that into our destiantion
					foundDestination.comments.push(newComment);
					foundDestination.save();
					console.log(foundDestination);
					//Redirect them back to the page
					req.flash("success", "Comment successfully posted");
					res.redirect("/destinations/view/" + req.params.id);
				}
			});
		}
	});
})

//Handle the logic for editing a comment that you own
app.put("/destinations/view/:id/comments/:comment_id", middleware.checkCommentOwnership, function(req, res){
	//If we make it through the middleware, find the comment using the :comment_id variable and pass in the new info from the body.
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, foundComment){
		if(err){
			req.flash("error", "Error updating comment");
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			req.flash("success", "Comment was updated successfully");
			res.redirect("/destinations/view/" + req.params.id);
		}
	});
})

//Handle the logic of deleting a comment, assuming that you own it that is
app.delete("/destinations/view/:id/comments/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, foundComment){
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			req.flash("success", "Comment was deleted successfully");
			res.redirect("/destinations/view/" + req.params.id);
		}
	});
})


//=======================
//REVIEW ROUTES
//=======================

//Show our edit page
app.get("/destinations/view/:id/reviews/:review_id/edit", middleware.checkReviewOwnership, function(req, res){
	Review.findById(req.params.review_id, function(err, foundReview){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("reviews/edit", {review: foundReview, destination: req.params.id});
		}
	})
	
})

//show the reviews page that will list all reviews.
app.get('/destinations/view/:id/reviews', function(req, res){
	Destination.findById(req.params.id).populate("reviews").exec(function(err, foundDestination){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("destinations/reviews", {destination: foundDestination});
		}
	});
});


//Handle the logic for submitting a review. ensure you are logged in to do so and that you havent already submitted one.
app.post("/destinations/view/:id/reviews", middleware.checkReviewExistence, function(req, res){
	Destination.findById(req.params.id).populate("reviews").exec(function(err, foundDestination){
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Review.create(req.body.review, function(err, newReview){
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
})

//Handle the logic for editing your reviews. Ensure you are logged in and that you own it.
app.put("/destinations/view/:id/reviews/:review_id", middleware.checkReviewOwnership, function(req, res){
	Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function(err, updatedReview){
		if(err){
			req.flash("error", "Error updating your review.");
			res.redirect("/destinations/view/" + req.params.id);
		} else {
			Destination.findById(req.params.id).populate("reviews").exec(function(err, foundDestination){
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
});

//Handle the log for deleting a review
app.delete("/destinations/view/:id/reviews/:review_id", middleware.checkReviewOwnership, function(req, res){
	Review.findById(req.params.review_id, function(err){
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		Destination.findById(req.params.id, {$pull: {reviews: req.params.review_id}}, {new:true}.populate("reviews").exec(function(err, foundDestination){
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
})

function calculateAverage(reviews){
	//If there are no reviews, then we want to return a 0 instead of null or undefined
	if(reviews.length === 0 ){
		return 0;
	}
	let sum = 0;
	reviews.forEach(function(reviews){
		sum += reviews.rating;
	});
	return sum / reviews.length;
}

//=======================
//LIKE ROUTES
//=======================

app.post("/destinations/view/:id/like", middleware.isLoggedIn, function(req, res){
	Destination.findById(req.params.id, function (err, foundDestination){
		if(err){
			req.flash("error", err.message);
			req.redirect("back");
		} else{
			User.findById(req.user._id, function(err, likeUser){
				//Check if the currently logged in user has already liked this destinations
				let foundUser = foundDestination.likes.some(function(like){
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
				foundDestination.save(function(errr){
					if(err){
						req.flash("error", err.message);
						return res.redirect("back");
					}
					return res.redirect("back");
				});
			});
		}
	});
});

//========================
//DESTINATION PAGE ROUTES
//Needs to be seperated for the destiantions/new route to work
//=======================

//Load our index page if they come in with an id parameter
app.get("/destinations/:id", function(req, res){
	
	const perPage = 2; // Max number of items per page
	const pageQuery = parseInt(req.query.page); 
	let pageNumber = pageQuery ? pageQuery : 1; //Current page number
	let filterParams = [""];
	
	if(req.params.id === "entertainment"){
		filterParams = ["restaurant", "shop"];
		}else if(req.params.id === "temples") {
			filterParams = ["temple", "shrine"];
			} else if(req.params.id === "exploration"){
				filterParams = ["city"];
				} else if(req.params.id === "hotels"){
					filterParams =  ["hotel", "ryokan"];
					} 
			
	//since were looking for multiple typeOf's, we need to use $in to accomplish this
	Destination.find({typeOf: {$in: filterParams}}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, foundDestination){
		Destination.countDocuments({typeOf: {$in: filterParams}}).exec(function(err, count){ //count how manmy destinations we have
			if(err){
				req.flash("error", err.message);
				res.redirect("/");
			} else {
				res.render("destinations/", {destination: foundDestination, count: count, id: '/'+req.params.id, title: req.params.id, current: pageNumber, pages: Math.ceil(count / perPage)});
			}
		})
	});
});

//==========================
//FORGOT PASSWORD ROUTES
//==========================

//forgot password router
app.get("/forgot", function(req, res){
	res.render("forgot");
})

//Handle forgot password logic
app.post("/forgot", function(req, res){
	aSync.waterfall([
		function(done){
			crypto.randomBytes(20, function(err, buf){
				let token = buf.toString('hex');
				done(err, token); //create our token
			});
		},
		function(token, done){
			User.findOne({email: req.body.email}, function(err, user){
				if(!user){ //if there is no user found
					req.flash("error", "No accounts with that email found"); //warn them that it doesnt exist
					return res.redirect("/forgot"); //end this call and send them back to the page to start over
				}
				
				user.resetPasswordToken = token; //set the token to the User profile
				user.resetPasswordExpires = Date.now() + 3600000 //1 hour, add the expiration for the token to the User profile
				user.save(function(err){
					done(err, token, user);
				});
			});
		},
		function(token, user, done){
			let smtpTransport = nodemailer.createTransport({
				service: "Gmail", 
				auth: {
				  user: "demodev996@gmail.com",
				  pass: process.env.GMAILPW
				}
      		});
			let mailOptions = {
				to: user.email,
				from: "demodev996@gmail.com",
				subject: "Kyoto Sightseeing Password Reset",
				text: "You are receiving this because you (or someone else) has requested the reset of the password for your account." + "\n\n" +
				"Please click the following link, or paste it into your browser to complete the process." + "\n\n" +
				"http://" + req.headers.host + "/reset/" + token + "\n\n" +
				"If you did not request this, please ignore this email and your password will remain unchanged"
			};
			smtpTransport.sendMail(mailOptions, function(err){
				console.log("Password reset for " + user.email + " has been sent.");
				req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions");
				res.redirect("/");
				done(err, "done");
			});
		}
	], function(err){
		if(err){
			req.flash("error", err);
			console.log(err);
			res.redirect("/forgot");
		}
	});
});

//Show the reset page if a token actually exists, if not warn them and redirect back to the forgot page
app.get("/reset/:token", function(req, res){
	User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user){
		if(!user){
			req.flash("error", "Password reset token is invalid or has expired");
			return res.redirect("/forgot");
		}
		res.render("reset", {token: req.params.token});
	})
})

//Handle the logic behind updating the password
app.post("/reset/:token", function(req, res){
	aSync.waterfall([
		function(done){
		User.findOne({resetPasswordToken: req.params.token}, function(err, user){
		if(!user){
			req.flash("error", "Password reset token is invalid or has expired");
			return res.redirect("/");
		}
		
		if(req.body.password === req.body.confirm){
			user.setPassword(req.body.password, function(err){
				user.resetPasswordToken = undefined;
				user.resetPasswordExpires = undefined;
				
				user.save(function(err){
					req.logIn(user, function(err){
						done(err, user);
					});
				});
			})
		} else {
			req.flash("error", "Passwords do not match");
			return res.redirect("back");
		}
		});
		},
		
		function(user, done){
			let smtpTransport = nodemailer.createTransport({
				service: "Gmail", 
				auth: {
				  user: "demodev996@gmail.com",
				  pass: process.env.GMAILPW
				}
			});
			let mailOptions = {
				to: user.email,
				from: "demodev996@gmail.com",
				subject: "Kyoto Sightseeing Password Reset",
				text: "Hello" + "\n\n" +
				"This is confirmation that youre password has been reset for account " + user.email + "/n"
			};
			smtpTransport.sendMail(mailOptions, function(err){
				console.log("Password reset for " + user.email + " has been completed");
				req.flash("success", "Your password has been changed");
				res.redirect("/");
				done(err, "done");
			});
		}
	]), function(err){
		res.redirect("/");
	};
});

//=========================
//ADMIN ROUTES
//=========================

//show the main landing page
app.get("/admin", middleware.checkAdminPriveleges, function(req, res){
	User.find(function(err, foundUsers){
		if(err){
			req.flash("error", "Could not find users");
			res.redirect("/");
		} else {
			Destination.find(function(err, foundDestinations){
				if(err){
					req.flash("error", "Could not find destinations");
					res.redirect("/");
				} else {
					res.render("admin", {users: foundUsers, destinations: foundDestinations});
				}
			})
		}
	})
})

app.post("/admin/edit/:id", middleware.checkAdminPriveleges, function(req, res){
	User.findOne({id: req.params.id}, function(err, foundUser){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.body.userEdit.isAdmin === "on"){
				req.body.userEdit.isAdmin = true;;
			} else{
				req.body.userEdit.isAdmin = false;
			}
			User.findByIdAndUpdate(req.params.id, req.body.userEdit, function(err, foundUser){
				if(err){
					req.flash("error", err.message);
					res.redirect("back");
				} else {
					req.flash("success", "User " + foundUser.username +  " has been updated");
					res.redirect("/admin");
				}
			})
		}
	})
});

//=========================
//CATCH ALL ROUTE
//=========================
//If a route doesn't exist, send them back to the landing page
app.get("*", function(req, res){
	req.flash("error", "That page does not exist");
	res.redirect("/");
})

//====================
//DECLARATIONS
//======================
//Declaration for our search to match any character
function escapeRegex(text) {
	//match any characters globally
	return text.replace(/[-[\]{}()*+?.,\\^$|@\s]/g, "\\&&");
};

//==========================
//LISTEN FOR THE DATABASE
//==========================

const port = process.env.PORT || 3000;
app.listen(port, process.env.IP, function(){
	console.log("Koyto Server Has Started");
});