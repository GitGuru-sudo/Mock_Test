'use strict';

const express  = require('express');
const { body } = require('express-validator');

const protect            = require('../middleware/protect');
const requireAdmin       = require('../middleware/requireAdmin');
const validate           = require('../middleware/validate');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

// GET /api/students
router.get('/', protect, studentsController.listStudents);

// GET /api/students/:id
router.get('/:id', protect, studentsController.getStudent);

// POST /api/students
router.post(
  '/',
  protect,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
    body('branch').isIn(['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT']).withMessage('Invalid branch'),
    body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be 1–4'),
    body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10'),
    validate,
  ],
  studentsController.createStudent
);

// PUT /api/students/:id
router.put(
  '/:id',
  protect,
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
    body('branch').optional().isIn(['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT']).withMessage('Invalid branch'),
    body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be 1–4'),
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10'),
    validate,
  ],
  studentsController.updateStudent
);

// GET /api/students/:id/timeline
router.get('/:id/timeline', protect, studentsController.getStudentTimeline);

// DELETE /api/students/:id
router.delete('/:id', protect, requireAdmin, studentsController.deleteStudent);

module.exports = router;
