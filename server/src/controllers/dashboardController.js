'use strict';

const dashboardService = require('../services/dashboardService');

/**
 * GET /api/dashboard/stats
 */
async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getStats();
    return res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched',
      data:    stats,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStats };
