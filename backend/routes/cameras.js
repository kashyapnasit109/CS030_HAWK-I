const express = require('express');
const router = express.Router();
const multer = require('multer');
const camerasController = require('../controllers/cameras');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, camerasController.getCameras);

const upload = multer({ storage: multer.memoryStorage() });
router.post(
  '/:camera_id/simulate-feed', 
  authenticate, 
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'reference', maxCount: 1 },
    { name: 'current', maxCount: 1 },
    { name: 'entry_gate', maxCount: 1 },
    { name: 'interior', maxCount: 1 }
  ]), 
  camerasController.simulateFeed
);

module.exports = router;
