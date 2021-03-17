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
	  dotenv = require("dotenv"),
	  userRoutes = require('./routes/user-routes'),
	  destinationRoutes = require('./routes/destination-routes'),
	  destinationReviewAndCommentRoutes = require('./routes/destination-rev-com-routes');


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
app.use((req, res, next) =>{
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

//=====================================
// USER ROUTES
// Handles signup, login, logout
//=====================================
app.use('/users/', userRoutes);


//=========================
//DESTINATION ROUTES
// Handles viewing our destinations, as well as editing and deleting them
//=========================
app.use('/destinations/', destinationRoutes)


//=========================
//COMMENT, LIKE & REVIEW ROUTES
//=========================
app.use('/destinations/view/', destinationReviewAndCommentRoutes)


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
		Destination.countDocuments({typeOf: {$in: filterParams}}).exec(function(err, count){ //count how many destinations we have
			if(err){
				req.flash("error", err.message);
				res.redirect("/");
			} else {
				res.render("destinations/", {destination: foundDestination, count: count, id: '/'+req.params.id, title: req.params.id, current: pageNumber, pages: Math.ceil(count / perPage)});
			}
		})
	});
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