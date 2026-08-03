const express = require('express');
const router = express.Router();
const multer = require('multer');
const modulesController = require('../controllers/modules');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// ANPR Test Bench
router.post('/anpr/test', authenticate, upload.single('file'), modulesController.testAnpr);

// Velocity Detection Test Bench
router.post('/velocity/test', authenticate, upload.single('file'), modulesController.testVelocity);

// Object Misplacement Test Bench (dual file upload)
router.post(
  '/misplacement/test',
  authenticate,
  upload.fields([
    { name: 'reference', maxCount: 1 },
    { name: 'current', maxCount: 1 }
  ]),
  modulesController.testMisplacement
);
);

// Threat / Anomaly Detection Test Bench
router.post('/threat/test', authenticate, upload.single('file'), modulesController.testThreat);

// Unauthorized Entry Detection Test Bench (dual file upload)
router.post(
  '/entry/test',
  authenticate,
  upload.fields([
    { name: 'entry_gate', maxCount: 1 },
    { name: 'interior', maxCount: 1 }
  ]),
  modulesController.testEntry
);

module.exports = router;
