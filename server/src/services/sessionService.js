'use strict';

const InterviewSession = require('../models/InterviewSession');
const ApiError         = require('../utils/ApiError');

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new interview session, returning it populated with company data.
 */
async function createSession(data) {
  const session = await InterviewSession.create(data);
  return session.populate('company');
}

/**
 * List sessions with optional filters: companyId, status, dateFrom, dateTo.
 * Results are sorted by scheduledDate descending.
 */
async function listSessions(filters = {}) {
  const query = {};

  if (filters.companyId) query.company = filters.companyId;
  if (filters.status)    query.status  = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    query.scheduledDate = {};
    if (filters.dateFrom) query.scheduledDate.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   query.scheduledDate.$lte = new Date(filters.dateTo);
  }

  return InterviewSession.find(query)
    .populate('company')
    .sort({ scheduledDate: -1 });
}

/**
 * Fetch a single session by id, populated with company data.
 */
async function getSessionById(id) {
  const session = await InterviewSession.findById(id).populate('company');
  if (!session) throw new ApiError(404, 'Session not found');
  return session;
}

/**
 * Update the status of a session.
 */
async function updateSessionStatus(id, status) {
  const session = await InterviewSession.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate('company');
  if (!session) throw new ApiError(404, 'Session not found');
  return session;
}

/**
 * Return eligible students for a session (with attendance/eligibility info).
 * Round 1: all active students are eligible.
 * Later rounds: only students who passed the previous round for the same company.
 */
async function getEligibleStudents(sessionId) {
  const InterviewSession = require('../models/InterviewSession')
  const Student = require('../models/Student')
  const Attendance = require('../models/Attendance')
  const Result = require('../models/Result')

  const session = await InterviewSession.findById(sessionId).populate('company')
  if (!session) throw new ApiError(404, 'Session not found')

  const students = await Student.find({ isDeleted: false })

  const attendanceRecords = await Attendance.find({ session: sessionId })
  const attendanceByStudent = {}
  for (const att of attendanceRecords) {
    attendanceByStudent[String(att.student)] = att
  }

  const results = await Result.find({ company: session.company._id })
  const resultsByStudent = {}
  for (const r of results) {
    const sid = String(r.student)
    if (!resultsByStudent[sid]) resultsByStudent[sid] = {}
    resultsByStudent[sid][r.roundNumber] = r
  }

  const rows = students.map((student) => {
    const sid = String(student._id)
    const att = attendanceByStudent[sid] || null
    const studentResults = resultsByStudent[sid] || {}

    let eligible = true
    let reason = null

    const failedRound = Object.values(studentResults).find((r) => r.outcome === 'fail')
    if (failedRound) {
      eligible = false
      reason = `Failed in round ${failedRound.roundNumber}`
    }

    if (eligible && session.roundNumber > 1) {
      const prevRoundResult = studentResults[session.roundNumber - 1]
      if (!prevRoundResult || prevRoundResult.outcome !== 'pass') {
        eligible = false
        reason = `Did not pass round ${session.roundNumber - 1}`
      }
    }

    return {
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        branch: student.branch,
        year: student.year,
        cgpa: student.cgpa,
        placementStatus: student.placementStatus,
      },
      attendance: att ? { status: att.status, markedAt: att.markedAt, _id: att._id } : null,
      existingResult: studentResults[session.roundNumber] ? { _id: studentResults[session.roundNumber]._id, outcome: studentResults[session.roundNumber].outcome, remarks: studentResults[session.roundNumber].remarks } : null,
      eligible,
      reason,
    }
  })

  return { session, students: rows }
}

module.exports = { createSession, listSessions, getSessionById, updateSessionStatus, getEligibleStudents };
