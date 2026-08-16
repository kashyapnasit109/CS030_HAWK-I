const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, eventsController.getEvents);
router.get('/:id', authenticate, eventsController.getEventById);
router.post('/', authenticate, eventsController.createEvent);

module.exports = router;
