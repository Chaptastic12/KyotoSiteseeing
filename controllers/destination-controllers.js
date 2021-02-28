//Initialize 'express' and 'app' so that we can properly set up other dependencies
const express = require('express'),
      Destination = require('../models/destinations'),
      flash = require('connect-flash'),
      app = express();

//Set it so we no longer need to add the .ejs to our routes
app.set("view engine", "ejs");

//Necessary for the error/success messages
app.use( flash() );

//====================
//DECLARATIONS
//======================
//Declaration for our search to match any character
function escapeRegex(text) {
	//match any characters globally
	return text.replace(/[-[\]{}()*+?.,\\^$|@\s]/g, "\\&&");
};

//////////////////////////////////////////////////////////////////////////////////////////////////
//
//               BEGIN HANDLING ROUTES BELOW
//
//////////////////////////////////////////////////////////////////////////////////////////////////