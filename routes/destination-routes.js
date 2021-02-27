const express = require('express');
const { check } = require ('express-validator');

//Need the router method specifically so we can export and import into app.js
const router = express.Router();

const destinationControllers = require('../controllers/destination-controllers');

router.get();