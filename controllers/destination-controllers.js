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

//====================
//DECLARATIONS
//======================
//Declaration for our search to match any character
const escapeRegex = (text) =>{
	//match any characters globally
	return text.replace(/[-[\]{}()*+?.,\\^$|@\s]/g, "\\&&");
};

//////////////////////////////////////////////////////////////////////////////////////////////////
//
//               BEGIN HANDLING ROUTES BELOW
//
//////////////////////////////////////////////////////////////////////////////////////////////////

const showMainDestinationPage = (req, res, next) =>{
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
		const spliceSearch = req.query.search.substring(0, n!=-1 ? n : req.query.search.length);
		//Put it into the RegExp() so we are effectively searching the right term again
		const regex = new RegExp(escapeRegex(spliceSearch), 'gi');
		//If wanting to expand in the future, use Destination.find({$or: [{name: regex},{description: regex}]}, function
		Destination.find({name: regex}).skip((perPage * searchPageNumber) - perPage).limit(perPage).exec((err, foundDestination) =>{
			Destination.countDocuments({name:regex}).exec((err, count) =>{ //count how many destinations we have
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
		Destination.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec((err, foundDestination) =>{
			Destination.countDocuments({}).exec((err, count) =>{ //count how manmy destinations we have
				if(err){
					req.flash("error", err.message);
					 res.redirect("/landing");
				} else {
					res.render("destinations/", {destination: foundDestination, count: count, id: "/", title: "view All Destinations", current: pageNumber, pages: Math.ceil(count / perPage)})
				}
			});
		});
	}
};

const showSeasonalDestinationPage = (req, res, next) =>{
    const perPage = 2; // Max number of items per page
	const pageQuery = parseInt(req.query.page); //get the page number from the query
	let pageNumber = pageQuery ? pageQuery : 1; //Current page number

	let queryParams = {};
	//Check if an id got passed or not
	if(req.params.id === 'all'){
		queryParams = {season: {$in: ["fall", "spring", "winter", "summer"] } };
	}else if (req.params.id !== 'fall' || req.params.id !== 'spring' || req.params.id !== 'winter' || req.params.id !=='summer') {
		req.flash("error", "That is not a valid season");
		res.redirect("/");
		} else {
			queryParams = {season: req.params.id};
	}

	Destination.find(queryParams).skip((perPage * pageNumber) - perPage).limit(perPage).exec((err, foundDestination) =>{
		Destination.countDocuments(queryParams).exec((err, count) =>{ //count how manmy destinations we have
			if(err){
				req.flash("error", err.message);
				res.redirect("/");
			} else {
				res.render("destinations/seasonal", {destination: foundDestination, season: req.params.id, current: pageNumber, pages: Math.ceil(count / perPage), count:count});
			}
		});
	});
};

const showDestinationDetailsPage = (req, res, next) =>{
    //Populate with the comments, likes, and reviews for this specific destination.
	Destination.findById(req.params.id).populate("comments").populate("likes").populate({path: "reviews", options: {sort: {createdAt: -1}}}).exec((err, foundDestination) =>{
		if(err || !foundDestination){
			req.flash("error", "Error viewing destination");
			res.redirect("/destinations");
		} else {
			res.render("destinations/view", {destination: foundDestination});
		}
	});
};

const createNewDestination = (req, res, next) =>{
    res.render("destinations/new");
};

const createNewDestinationLogic = (req, res, next) =>{
    //We currently only accept things in Kyoto, so define the prefectures there
	req.body.destination.prefecture = "Kyoto Prefecture";

	//Create the new destination using the 'destiantion' object received from the form
	Destination.create(req.body.destination, (err, newDestination) =>{
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
};

const showEditPageForDestination = (req, res, next) =>{
    Destination.findById(req.params.id, (err, foundDestination) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations/");
		}
		res.render("destinations/edit", {destination: foundDestination});
	});
};

const editDestinationInformation = (req, res, next)=>{
    //Find the destination using params.id. In order to prevent likes and else from being overwritte, specify what is being updated and proceed
	Destination.findById(req.params.id, (err, updatedDestination) =>{
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
			updatedDestination.save((err) =>{
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
};

const deleteDestination = (req, res, next) =>{
    //Find the id sent and remove it
	Destination.findByIdAndRemove(req.params.id, (err, deleteDestination) =>{
		if(err){
			req.flash("error", err.message);
			res.redirect("/destinations");
		} else {
			//delete all comments associated
			Comment.remove({_id: {$in: deleteDestination.comments}}, (err) =>{
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
};

const showSpecificDestinationPage = (req, res, next) =>{
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
	Destination.find({typeOf: {$in: filterParams}}).skip((perPage * pageNumber) - perPage).limit(perPage).exec((err, foundDestination) =>{
		Destination.countDocuments({typeOf: {$in: filterParams}}).exec((err, count) =>{ //count how many destinations we have
			if(err){
				req.flash("error", err.message);
				res.redirect("/");
			} else {
				res.render("destinations/", {destination: foundDestination, count: count, id: '/'+req.params.id, title: req.params.id, current: pageNumber, pages: Math.ceil(count / perPage)});
			}
		})
	});
}

exports.showMainDestinationPage = showMainDestinationPage;
exports.showSeasonalDestinationPage = showSeasonalDestinationPage;
exports.showDestinationDetailsPage = showDestinationDetailsPage;
exports.createNewDestination = createNewDestination;
exports.createNewDestinationLogic = createNewDestinationLogic;
exports.showEditPageForDestination = showEditPageForDestination;
exports.editDestinationInformation = editDestinationInformation;
exports.deleteDestination = deleteDestination;
exports.showSpecificDestinationPage = showSpecificDestinationPage;