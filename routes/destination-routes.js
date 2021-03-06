const express = require('express'),
      { check } = require ('express-validator'),
      middleware = require('../middleware/index'),
      destinationControllers = require('../controllers/destination-controllers');

//Need the router method specifically so we can export and import into app.js
const router = express.Router();


//Show our main index page that will list all of the destinations
router.get('/', destinationControllers.showMainDestinationPage);

//Show all our Seasonal destinations
router.get('/seasonal/:id', destinationControllers.showSeasonalDestinationPage);

//Show the details page for a destination
router.get('/view/:id', destinationControllers.showDestinationDetailsPage);

//Show the creation page for a new destination
router.get('/create/new', middleware.isLoggedIn, destinationControllers.createNewDestination);

//Handle the creation logic for a new destination
router.post('/create/new', middleware.isLoggedIn, destinationControllers.createNewDestinationLogic);

//Show the edit page for an existing destination
router.get('/edit/:id', middleware.ownsDestination, destinationControllers.showEditPageForDestination);

//Handle the edit logic for an existing destination
router.put('/edit/:id', middleware.ownsDestination, destinationControllers.editDestinationInformation)

//Delete an existing destinaiton
router.delete('/delete/:id', middleware.ownsDestination, destinationControllers.deleteDestination);

router.get('/:id', destinationControllers.showSpecificDestinationPage);

//Export our routes
module.exports = router;