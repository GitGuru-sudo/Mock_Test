'use strict';

const sessionService = require('../services/sessionService');

/**
 * POST /api/sessions
 */
async function createSession(req, res, next) {
  try {
    const session = await sessionService.createSession(req.body);
    return res.status(201).json({
      success: true,
      message: 'Session created',
      data:    { session },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sessions
 */
async function listSessions(req, res, next) {
  try {
    const { companyId, status, dateFrom, dateTo } = req.query;
    const filters = {};
    if (companyId) filters.companyId = companyId;
    if (status)    filters.status    = status;
    if (dateFrom)  filters.dateFrom  = dateFrom;
    if (dateTo)    filters.dateTo    = dateTo;

    const sessions = await sessionService.listSessions(filters);
    return res.status(200).json({
      success: true,
      message: 'Sessions fetched',
      data:    sessions,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sessions/:id
 */
async function getSession(req, res, next) {
  try {
    const session = await sessionService.getSessionById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Session fetched',
      data:    { session },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/sessions/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    const session = await sessionService.updateSessionStatus(req.params.id, req.body.status);
    return res.status(200).json({
      success: true,
      message: 'Session updated',
      data:    { session },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sessions/:id/eligible-students
 */
async function getEligibleStudents(req, res, next) {
  try {
    const data = await sessionService.getEligibleStudents(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Eligible students fetched',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createSession, listSessions, getSession, updateStatus, getEligibleStudents };
