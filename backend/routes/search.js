const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, searchController.searchEvents);

module.exports = router;
