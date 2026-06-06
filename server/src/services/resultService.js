'use strict';

const Result           = require('../models/Result');
const InterviewSession = require('../models/InterviewSession');
const Student          = require('../models/Student');
const ApiError         = require('../utils/ApiError');
const redis            = require('../config/redis');
const attendanceService = require('./attendanceService');

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Record a result for a student in a session.
 * Enforces three gates before creating the record:
 *   1. Attendance gate  – student must have been present
 *   2. Round sequence   – student must have passed the previous round (if round > 1)
 *   3. Elimination      – student must not have already failed for this company
 *
 * @param {string} sessionId
 * @param {string} studentId
 * @param {string} outcome   - 'pass' | 'fail' | 'offer' | 'pending'
 * @param {string} [remarks]
 * @returns {Promise<Object>} created Result document
 */
async function recordResult(sessionId, studentId, outcome, remarks) {
  // GATE 1 — Attendance check
  const isPresent = await attendanceService.wasPresent(sessionId, studentId);
  if (!isPresent) {
    throw new ApiError(422, 'Student was not present in this session', [{ code: 'ATTENDANCE_GATE' }]);
  }

  // Fetch session (needed for gates 2 & 3 and for creating the result)
  const session = await InterviewSession.findById(sessionId).populate('company');
  if (!session) throw new ApiError(404, 'Session not found');

  // GATE 2 — Round sequence (only if roundNumber > 1)
  if (session.roundNumber > 1) {
    const priorPass = await Result.findOne({
      student:     studentId,
      company:     session.company._id,
      roundNumber: session.roundNumber - 1,
      outcome:     'pass',
    });
    if (!priorPass) {
      throw new ApiError(422, 'Student has not passed the previous round', [{ code: 'ROUND_SEQUENCE' }]);
    }
  }

  // GATE 3 — Elimination check
  const existingFail = await Result.findOne({
    student: studentId,
    company: session.company._id,
    outcome: 'fail',
  });
  if (existingFail) {
    throw new ApiError(422, 'Student has been eliminated from this company', [{ code: 'ELIMINATED' }]);
  }

  // CREATE result
  const result = await Result.create({
    session:     sessionId,
    student:     studentId,
    company:     session.company._id,
    roundNumber: session.roundNumber,
    outcome,
    remarks,
    recordedAt:  new Date(),
  });

  // SIDE EFFECTS
  if (outcome === 'offer') {
    await Student.findByIdAndUpdate(studentId, { placementStatus: 'placed' });
  }

  await redis?.del('dashboard:stats');

  return result;
}

/**
 * Return all results for a session, populated with student and company info.
 *
 * @param {string} sessionId
 * @returns {Promise<Array>}
 */
async function getResultsBySession(sessionId) {
  return Result.find({ session: sessionId })
    .populate('student', 'name studentId branch')
    .populate('company', 'name');
}

/**
 * Return all results for a student, sorted newest first.
 *
 * @param {string} studentId
 * @returns {Promise<Array>}
 */
async function getResultsByStudent(studentId) {
  return Result.find({ student: studentId })
    .populate('session')
    .populate('company')
    .sort({ recordedAt: -1 });
}

/**
 * Update the outcome (and optionally remarks) of an existing result.
 *
 * @param {string} id
 * @param {{ outcome?: string, remarks?: string }} updates
 * @returns {Promise<Object>} updated Result document (populated with student)
 */
async function updateResult(id, { outcome, remarks }) {
  const updateFields = {};
  if (outcome !== undefined) updateFields.outcome = outcome;
  if (remarks !== undefined) updateFields.remarks = remarks;

  const result = await Result.findByIdAndUpdate(
    id,
    updateFields,
    { new: true, runValidators: true }
  ).populate('student');

  if (!result) throw new ApiError(404, 'Result not found');

  if (outcome === 'offer') {
    await Student.findByIdAndUpdate(result.student._id, { placementStatus: 'placed' });
  }

  await redis?.del('dashboard:stats');

  return result;
}

module.exports = { recordResult, getResultsBySession, getResultsByStudent, updateResult };
