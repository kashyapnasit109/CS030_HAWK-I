const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehicles');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, vehiclesController.getVehicles);

module.exports = router;
