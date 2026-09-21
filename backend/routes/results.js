const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/results');

// Results list & summary (public/authenticated optional)
router.get('/', resultsController.getResults);
router.get('/summary', resultsController.getResultsSummary);
router.get('/:id', resultsController.getResultById);
router.get('/:id/clip', resultsController.streamClip);

module.exports = router;
