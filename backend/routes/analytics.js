const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, analyticsController.getSummary);

module.exports = router;
