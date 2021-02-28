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
//
//               BEGIN HANDLING ROUTES BELOW
//
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
//               SHOW OUR REGISTRATION PAGE
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
        User.register(newUser, req.body.password, (err, user) =>{
            if(err){
                //If we run into an error, return the error and redirect back the register page
                req.flash("error", err.message);
                return res.redirect("/register");
            } //don't need an 'else' because the return breaks us out if it fails
            //Authenticate them and log them in
            passport.authenticate("local")(req, res, () =>{
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
    User.findById(req.params.id).populate("likes").exec((err, foundUser) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			res.render("users/", {user: foundUser});
		}
	})
}


//////////////////////////////////////////////////////////////////////////////
//               SHOW OUR FORGOT PASSWORD PAGE
/////////////////////////////////////////////////////////////////////////////
const showForgotPasswordPage = (req, res, next) =>{
    res.render("forgot");
}


////////////////////////////////////////////////////////////////////////////
//               HANDLE RESETTING THE PASSWORD
//
//First, create and encrypt our token
//Then, make sure the requested email exists. If so, assign the token and
//set the expiry time.
//Then, using nodemailer, send the e-mail with the token
//NOTE THAT GMAIL IS UNRELIABLE AND NEEDS TO BE REMINDED TO ALLOW THIS TO WORK
//THAT IS WHY THIS IS CURRENT DISABLED
////////////////////////////////////////////////////////////////////////////
const resetPassword = (req, res, next) =>{
    // aSync.waterfall([
	// 	function(done){
	// 		crypto.randomBytes(20, (err, buf) =>{
	// 			let token = buf.toString('hex');
	// 			done(err, token); //create our token
	// 		});
	// 	},
	// 	function(token, done){
	// 		User.findOne({email: req.body.email}, (err, user) =>{
	// 			if(!user){ //if there is no user found
	// 				req.flash("error", "No accounts with that email found"); //warn them that it doesnt exist
	// 				return res.redirect("/forgot"); //end this call and send them back to the page to start over
	// 			}
				
	// 			user.resetPasswordToken = token; //set the token to the User profile
	// 			user.resetPasswordExpires = Date.now() + 3600000 //1 hour, add the expiration for the token to the User profile
	// 			user.save(function(err){
	// 				done(err, token, user);
	// 			});
	// 		});
	// 	},
	// 	function(token, user, done){
	// 		let smtpTransport = nodemailer.createTransport({
	// 			service: "Gmail", 
	// 			auth: {
	// 			  user: "demodev996@gmail.com",
	// 			  pass: process.env.GMAILPW
	// 			}
    //   		});
	// 		let mailOptions = {
	// 			to: user.email,
	// 			from: "demodev996@gmail.com",
	// 			subject: "Kyoto Sightseeing Password Reset",
	// 			text: "You are receiving this because you (or someone else) has requested the reset of the password for your account." + "\n\n" +
	// 			"Please click the following link, or paste it into your browser to complete the process." + "\n\n" +
	// 			"http://" + req.headers.host + "/users/reset/" + token + "\n\n" +
	// 			"If you did not request this, please ignore this email and your password will remain unchanged"
	// 		};
	// 		smtpTransport.sendMail(mailOptions, (err) =>{
	// 			console.log("Password reset for " + user.email + " has been sent.");
	// 			req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions");
	// 			res.redirect("/");
	// 			done(err, "done");
	// 		});
	// 	}
	// ], function(err){
	// 	if(err){
	// 		req.flash("error", err);
	// 		console.log(err);
	// 		res.redirect("/forgot");
	// 	}
	// });
	res.redirect("/forgot");
}


//////////////////////////////////////////////////////////////////////////////
//               SHOW OUR RESET PASSWORD PAGE W/ TOKEN
/////////////////////////////////////////////////////////////////////////////
const showResetPasswordTokenPage = (req, res, next) =>{
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, (err, user) =>{
		if(!user){
			req.flash("error", "Password reset token is invalid or has expired");
			return res.redirect("/forgot");
		}
		res.render("reset", {token: req.params.token});
	})
}


////////////////////////////////////////////////////////////////////////////
//          HANDLE RESETTING THE PASSWORD IF TOKEN IS VALID
//
//First ensure that the token we get is valid. If so, allow them to continue
//Let them enter in their new password and confirmation of said password
//If they match, clear the token and expiry date from that user and update PW
//Then, using nodemailer, send confirmation e-mail
///////////////////////////////////////////////////////////////////////////
const resetPasswordWithToken = (req, res, next) =>{
    aSync.waterfall([
		(done) =>{
		User.findOne({resetPasswordToken: req.params.token}, (err, user) =>{
			if(!user){
				req.flash("error", "Password reset token is invalid or has expired");
				return res.redirect("/");
			}
			
			if(req.body.password === req.body.confirm){
				user.setPassword(req.body.password, (err) =>{
					user.resetPasswordToken = undefined;
					user.resetPasswordExpires = undefined;
					
					user.save((err) =>{
						req.logIn(user, (err) =>{
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
		
		(user, done) =>{
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
			smtpTransport.sendMail(mailOptions, (err) =>{
				console.log("Password reset for " + user.email + " has been completed");
				req.flash("success", "Your password has been changed");
				res.redirect("/");
				done(err, "done");
			});
		}
	]), (err) =>{
		res.redirect("/");
	};
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
exports.showForgotPasswordPage = showForgotPasswordPage;
exports.resetPassword = resetPassword;
exports.showResetPasswordTokenPage = showResetPasswordTokenPage;
exports.resetPasswordWithToken = resetPasswordWithToken;