const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, alertsController.getAlerts);
router.patch('/:id', authenticate, requireRole(['admin', 'operator']), alertsController.updateAlertStatus);

module.exports = router;
