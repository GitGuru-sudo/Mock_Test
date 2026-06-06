'use strict';

const resultService = require('../services/resultService');

/**
 * POST /api/results
 */
async function recordResult(req, res, next) {
  try {
    const { sessionId, studentId, outcome, remarks } = req.body;
    const result = await resultService.recordResult(sessionId, studentId, outcome, remarks);
    return res.status(201).json({
      success: true,
      message: 'Result recorded',
      data:    { result },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/results/session/:sessionId
 */
async function getResultsBySession(req, res, next) {
  try {
    const results = await resultService.getResultsBySession(req.params.sessionId);
    return res.status(200).json({
      success: true,
      message: 'Results fetched',
      data:    results,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/results/student/:studentId
 */
async function getResultsByStudent(req, res, next) {
  try {
    const results = await resultService.getResultsByStudent(req.params.studentId);
    return res.status(200).json({
      success: true,
      message: 'Results fetched',
      data:    results,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/results/:id
 */
async function updateResult(req, res, next) {
  try {
    const { outcome, remarks } = req.body;
    const result = await resultService.updateResult(req.params.id, { outcome, remarks });
    return res.status(200).json({
      success: true,
      message: 'Result updated',
      data:    { result },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { recordResult, getResultsBySession, getResultsByStudent, updateResult };
