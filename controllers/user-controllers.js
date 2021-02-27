//Initialize 'express' and 'app' so that we can properly set up other dependencies
const express = require('express'),
      User = require('../models/user'),
      flash = require('connect-flash'),
      passport = require('passport'),
      LocalStrategy = require('passport-local'),
      app = express();
      
//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Necessary for the error/success messages
app.use( flash() );

//Passport Configuration
//Requires 'passport' and 'passport-local'
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


//////////////////////////////////////////////////////////////////////////////////////////////////
//               BEGIN HANDLING ROUTES BELOW
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
//               SHOW OUR REGISTRATION PAGE
//
/////////////////////////////////////////////////////////////////////////////
const showRegisterPage = (req, res, next) =>{
    res.render("register");
}


////////////////////////////////////////////////////////////////////////////
//               HANDLE REGSITRATION LOGIC
//
//Create our new User object, then register the user if all
//entered info is valid. Use 'passport' to then register and log them in.
//Throw errors if applicable.
////////////////////////////////////////////////////////////////////////////
const registerUser = (req, res, next) =>{
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
}


//////////////////////////////////////////////////////////////////////////////
//               SHOW OUR LOGIN PAGE
//
/////////////////////////////////////////////////////////////////////////////
const showLogInPage = (req, res, next) =>{
    res.render("login");
}


////////////////////////////////////////////////////////////////////////////
//               HANDLE LOGIN LOGIC
//
//Use 'passport.authenticate' middleware to handle all the work for us. 
////////////////////////////////////////////////////////////////////////////
const logInUser = passport.authenticate("local", {
                    successRedirect: "back",
                    failureRedirect: "/login"
                });


//////////////////////////////////////////////////////////////////////////////
//               HANDLE LOGOUT LOGIC
//
//Use 'logout' to log them out. Redirect them back to the main page once done
//////////////////////////////////////////////////////////////////////////////                
const logOutUser = (req, res, next) =>{
    req.logout();
	req.flash("success", "Successfully logged you out.");
	res.redirect("/");
}


////////////////////////////////////////////////////////////////////////////
//               HANDLE SHOWING PROFILE PAGE
//
//First loate the user based on the id in the URL.
//Then, populate with their liked items as that is what this page shows
//If an error, direct them back to where they were.
//If successful, allow them to the page
////////////////////////////////////////////////////////////////////////////
const showUserProfilePage = (req, res, next) =>{
    User.findById(req.params.id).populate("likes").exec(function(err, foundUser){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("users/", {user: foundUser});
		}
	})
}

////////////////////////////////////////////////////////
//  Export our controllers for use in user-routes.js
////////////////////////////////////////////////////////
exports.showRegisterPage = showRegisterPage;
exports.registerUser = registerUser;
exports.showLogInPage = showLogInPage;
exports.logInUser = logInUser;
exports.logOutUser = logOutUser;
exports.showUserProfilePage = showUserProfilePage;