const express = require('express');
const router = express.Router();
const multer = require('multer');
const modulesController = require('../controllers/modules');
const { authenticate } = require('../middleware/auth');

// multer stores the file in memory so we can forward it as a buffer
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/modules/anpr/test — Test Bench only (does NOT write to detection_events)
router.post('/anpr/test', authenticate, upload.single('file'), modulesController.testAnpr);

module.exports = router;
