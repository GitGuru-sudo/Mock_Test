'use strict';

const attendanceService = require('../services/attendanceService');

/**
 * POST /api/attendance/bulk
 */
async function bulkMarkAttendance(req, res, next) {
  try {
    const { sessionId, records } = req.body;
    const attendance = await attendanceService.bulkMarkAttendance(sessionId, records);
    return res.status(200).json({
      success: true,
      message: 'Attendance marked',
      data:    { attendance },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/attendance/session/:sessionId
 */
async function getAttendanceBySession(req, res, next) {
  try {
    const attendance = await attendanceService.getAttendanceBySession(req.params.sessionId);
    return res.status(200).json({
      success: true,
      message: 'Attendance fetched',
      data:    attendance,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/attendance/:id
 */
async function updateAttendance(req, res, next) {
  try {
    const attendance = await attendanceService.updateAttendance(req.params.id, req.body.status);
    return res.status(200).json({
      success: true,
      message: 'Attendance updated',
      data:    { attendance },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { bulkMarkAttendance, getAttendanceBySession, updateAttendance };
