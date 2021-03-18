const express = require('express'),
      { check } = require ('express-validator'),
      middleware = require('../middleware/index'),
      adminControllers = require('../controllers/admin-controllers');

//Need the router method specifically so we can export and import into app.js
const router = express.Router();

//Show the main page for admin users
router.get('/', middleware.checkAdminPriveleges, adminControllers.showAdminPage);

//Handles updating a specific user
router.post('/edit/:id', middleware.checkAdminPriveleges, adminControllers.editUserLogic);

module.exports = router;