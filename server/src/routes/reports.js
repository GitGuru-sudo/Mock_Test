'use strict';

const express       = require('express');
const protect       = require('../middleware/protect');
const reportService = require('../services/reportService');

const router = express.Router();

// GET /api/reports
router.get('/', protect, async (req, res, next) => {
  try {
    const { companyId, branch, placementStatus, fromDate, toDate } = req.query;
    const data = await reportService.getFilteredReport({
      companyId,
      branch,
      placementStatus,
      fromDate,
      toDate,
    });
    return res.status(200).json({ success: true, message: 'Report fetched', data });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
