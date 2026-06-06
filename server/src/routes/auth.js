'use strict';

const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const protect = require('../middleware/protect');
const requireAdmin = require('../middleware/requireAdmin');
const loginRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/auth/register (admin only)
router.post(
  '/register',
  protect,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    validate,
  ],
  authController.register
);

// POST /api/auth/login  (rate-limited)
router.post(
  '/login',
  loginRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  authController.login
);

// POST /api/auth/refresh  (no validator needed — reads from cookie)
router.post('/refresh', authController.refresh);

// POST /api/auth/logout  (protected — requires valid access token)
router.post('/logout', protect, authController.logout);

module.exports = router;
