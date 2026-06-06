'use strict';

const express  = require('express');
const { body } = require('express-validator');

const protect             = require('../middleware/protect');
const requireAdmin        = require('../middleware/requireAdmin');
const validate            = require('../middleware/validate');
const companiesController = require('../controllers/companiesController');

const router = express.Router();

// GET /api/companies
router.get('/', protect, companiesController.listCompanies);

// GET /api/companies/:id
router.get('/:id', protect, companiesController.getCompany);

// POST /api/companies
router.post(
  '/',
  protect,
  [
    body('name').notEmpty().withMessage('Company name is required'),
    body('ctc').optional().isFloat({ min: 0 }).withMessage('CTC must be a positive number'),
    body('rounds').isArray({ min: 1 }).withMessage('At least one round is required'),
    body('rounds.*.roundName').notEmpty().withMessage('Round name is required'),
    body('rounds.*.roundType')
      .isIn(['aptitude', 'technical', 'coding', 'gd', 'hr'])
      .withMessage('Invalid round type'),
    validate,
  ],
  companiesController.createCompany
);

// PUT /api/companies/:id
router.put('/:id', protect, companiesController.updateCompany);

// DELETE /api/companies/:id
router.delete('/:id', protect, requireAdmin, companiesController.deleteCompany);

// PATCH /api/companies/:id/status
router.patch(
  '/:id/status',
  protect,
  [
    body('recruitmentStatus')
      .isIn(['upcoming', 'ongoing', 'completed'])
      .withMessage('Invalid status'),
    validate,
  ],
  companiesController.updateStatus
);

module.exports = router;
