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

const showAdminPage = (req, res, next) =>{
    User.find((err, foundUsers) =>{
		if(err){
			req.flash("error", "Could not find users");
			res.redirect("/");
		} else {
			Destination.find((err, foundDestinations) =>{
				if(err){
					req.flash("error", "Could not find destinations");
					res.redirect("/");
				} else {
					res.render("admin", {users: foundUsers, destinations: foundDestinations});
				}
			})
		}
	});
}

const editUserLogic = (req, res, next) =>{
    User.findOne({id: req.params.id}, (err, foundUser) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.body.userEdit.isAdmin === "on"){
				req.body.userEdit.isAdmin = true;;
			} else{
				req.body.userEdit.isAdmin = false;
			}
			User.findByIdAndUpdate(req.params.id, req.body.userEdit, (err, foundUser) =>{
				if(err){
					req.flash("error", err.message);
					res.redirect("back");
				} else {
					req.flash("success", "User " + foundUser.username +  " has been updated");
					res.redirect("/admin");
				}
			})
		}
	});
}

exports.showAdminPage = showAdminPage;
exports.editUserLogic = editUserLogic;