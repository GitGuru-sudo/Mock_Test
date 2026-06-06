'use strict';

const express = require('express');
const { body } = require('express-validator');

const protect              = require('../middleware/protect');
const validate             = require('../middleware/validate');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

// POST /api/attendance/bulk
router.post(
  '/bulk',
  protect,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('records').isArray({ min: 1 }).withMessage('Records must be a non-empty array'),
    body('records.*.studentId').notEmpty().withMessage('Student ID required'),
    body('records.*.status').isIn(['present', 'absent']).withMessage('Status must be present or absent'),
    validate,
  ],
  attendanceController.bulkMarkAttendance
);

// GET /api/attendance/session/:sessionId
router.get('/session/:sessionId', protect, attendanceController.getAttendanceBySession);

// PATCH /api/attendance/:id
router.patch(
  '/:id',
  protect,
  [
    body('status').isIn(['present', 'absent']).withMessage('Status must be present or absent'),
    validate,
  ],
  attendanceController.updateAttendance
);

module.exports = router;
