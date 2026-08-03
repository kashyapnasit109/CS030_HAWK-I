const express = require('express');
const router = express.Router();
const camerasController = require('../controllers/cameras');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, camerasController.getCameras);

module.exports = router;
