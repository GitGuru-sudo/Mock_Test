'use strict';

const express             = require('express');
const protect             = require('../middleware/protect');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', protect, dashboardController.getStats);

module.exports = router;
