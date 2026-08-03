const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, eventsController.getEvents);

module.exports = router;
