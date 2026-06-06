'use strict';

const express  = require('express');
const { body } = require('express-validator');

const protect            = require('../middleware/protect');
const validate           = require('../middleware/validate');
const sessionsController = require('../controllers/sessionsController');

const router = express.Router();

// GET /api/sessions
router.get('/', protect, sessionsController.listSessions);

// GET /api/sessions/:id
router.get('/:id', protect, sessionsController.getSession);

// POST /api/sessions
router.post(
  '/',
  protect,
  [
    body('company').notEmpty().withMessage('Company is required'),
    body('roundNumber').isInt({ min: 1 }).withMessage('Round number must be at least 1'),
    body('roundName').notEmpty().withMessage('Round name is required'),
    body('roundType')
      .isIn(['aptitude', 'technical', 'coding', 'gd', 'hr'])
      .withMessage('Invalid round type'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
    validate,
  ],
  sessionsController.createSession
);

// PATCH /api/sessions/:id/status
router.patch(
  '/:id/status',
  protect,
  [
    body('status')
      .isIn(['scheduled', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    validate,
  ],
  sessionsController.updateStatus
);

// GET /api/sessions/:id/eligible-students
router.get('/:id/eligible-students', protect, sessionsController.getEligibleStudents);

module.exports = router;
