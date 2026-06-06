'use strict';

const Attendance      = require('../models/Attendance');
const InterviewSession = require('../models/InterviewSession');
const Student         = require('../models/Student');
const ApiError        = require('../utils/ApiError');
const redis           = require('../config/redis');

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Bulk upsert attendance records for a session.
 * Also promotes 'not_placed' students to 'in_process' when present in round 1.
 *
 * @param {string} sessionId
 * @param {Array<{ studentId: string, status: 'present'|'absent' }>} records
 * @returns {Promise<Array>} array of upserted Attendance documents
 */
async function bulkMarkAttendance(sessionId, records) {
  const session = await InterviewSession.findById(sessionId).populate('company');
  if (!session) throw new ApiError(404, 'Session not found');

  // Upsert every record
  const upsertPromises = records.map((record) =>
    Attendance.findOneAndUpdate(
      { session: sessionId, student: record.studentId },
      {
        session:     sessionId,
        student:     record.studentId,
        company:     session.company._id,
        roundNumber: session.roundNumber,
        status:      record.status,
        markedAt:    new Date(),
      },
      { upsert: true, new: true }
    )
  );

  const attendanceDocs = await Promise.all(upsertPromises);

  // Promote 'not_placed' → 'in_process' for present students in round 1
  if (session.roundNumber === 1) {
    const promotionPromises = records
      .filter((r) => r.status === 'present')
      .map(async (r) => {
        const student = await Student.findById(r.studentId);
        if (student && student.placementStatus === 'not_placed') {
          await Student.findByIdAndUpdate(r.studentId, { placementStatus: 'in_process' });
        }
      });
    await Promise.all(promotionPromises);
  }

  // Invalidate cached dashboard stats
  await redis?.del('dashboard:stats');

  return attendanceDocs;
}

/**
 * Return all attendance records for a session, populated with student info.
 *
 * @param {string} sessionId
 * @returns {Promise<Array>}
 */
async function getAttendanceBySession(sessionId) {
  return Attendance.find({ session: sessionId })
    .populate('student', 'name studentId email branch');
}

/**
 * Update the status of a single attendance record.
 *
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Object>} updated Attendance document
 */
async function updateAttendance(id, status) {
  const attendance = await Attendance.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );
  if (!attendance) throw new ApiError(404, 'Attendance record not found');

  await redis?.del('dashboard:stats');

  return attendance;
}

/**
 * Check whether a student was present in a given session.
 *
 * @param {string} sessionId
 * @param {string} studentId
 * @returns {Promise<boolean>}
 */
async function wasPresent(sessionId, studentId) {
  const attendance = await Attendance.findOne({ session: sessionId, student: studentId });
  return attendance?.status === 'present';
}

module.exports = { bulkMarkAttendance, getAttendanceBySession, updateAttendance, wasPresent };
