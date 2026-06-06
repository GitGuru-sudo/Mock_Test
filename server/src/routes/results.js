'use strict';

const express = require('express');
const { body } = require('express-validator');

const protect           = require('../middleware/protect');
const validate          = require('../middleware/validate');
const resultsController = require('../controllers/resultsController');

const router = express.Router();

// POST /api/results
router.post(
  '/',
  protect,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('outcome').isIn(['pass', 'fail', 'offer', 'pending']).withMessage('Invalid outcome'),
    validate,
  ],
  resultsController.recordResult
);

// GET /api/results/session/:sessionId
router.get('/session/:sessionId', protect, resultsController.getResultsBySession);

// GET /api/results/student/:studentId
router.get('/student/:studentId', protect, resultsController.getResultsByStudent);

// PUT /api/results/:id
router.put(
  '/:id',
  protect,
  [
    body('outcome').optional().isIn(['pass', 'fail', 'offer', 'pending']).withMessage('Invalid outcome'),
    validate,
  ],
  resultsController.updateResult
);

module.exports = router;
