'use strict';

const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Result     = require('../models/Result');
const redis      = require('../config/redis');
const ApiError   = require('../utils/ApiError');

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function invalidateStudentCache() {
  const keys = (await redis?.keys('students:list:*')) || [];
  for (const key of keys) {
    await redis?.del(key);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new student with an auto-generated, collision-safe studentId.
 */
async function createStudent(data) {
  // Determine the next available studentId
  let studentId;
  let count = await Student.countDocuments();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    count += 1;
    studentId = `STU-${String(count).padStart(3, '0')}`;
    // Check for collision
    const existing = await Student.findOne({ studentId });
    if (!existing) break;
  }

  const student = await Student.create({ ...data, studentId });
  await invalidateStudentCache();
  return student;
}

/**
 * List students with optional filters, pagination, and Redis cache.
 */
async function listStudents(filters = {}, page = 1, limit = 20) {
  const query = { isDeleted: false };

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  if (filters.branch)          query.branch          = filters.branch;
  if (filters.placementStatus) query.placementStatus  = filters.placementStatus;
  if (filters.year)            query.year             = Number(filters.year);

  const hash     = JSON.stringify({ ...filters, page, limit });
  const cacheKey = `students:list:${hash}`;

  // Cache hit
  const cached = await redis?.get(cacheKey);
  if (cached) {
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return {
      students:   parsed.students,
      total:      parsed.total,
      page,
      limit,
      totalPages: Math.ceil(parsed.total / limit),
    };
  }

  const skip     = (page - 1) * limit;
  const students = await Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total    = await Student.countDocuments(query);

  await redis?.set(cacheKey, JSON.stringify({ students, total }), { ex: 30 });

  return { students, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Fetch a single student by id (must not be soft-deleted).
 */
async function getStudentById(id) {
  const student = await Student.findOne({ _id: id, isDeleted: false });
  if (!student) throw new ApiError(404, 'Student not found');
  return student;
}

/**
 * Update student fields (protects studentId and isDeleted from mutation).
 */
async function updateStudent(id, data) {
  // Prevent callers from overwriting protected fields
  const payload = { ...data };
  delete payload.isDeleted;
  delete payload.studentId;

  const student = await Student.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true, runValidators: true }
  );
  if (!student) throw new ApiError(404, 'Student not found');

  await invalidateStudentCache();
  return student;
}

/**
 * Soft-delete a student by id.
 */
async function softDeleteStudent(id) {
  const student = await Student.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!student) throw new ApiError(404, 'Student not found');

  await invalidateStudentCache();
  return student;
}

/**
 * Build a per-company timeline for a student showing attendance + result per round.
 */
async function getStudentTimeline(id) {
  const student = await getStudentById(id);

  const [attendances, results] = await Promise.all([
    Attendance.find({ student: id })
      .populate({ path: 'session', model: 'InterviewSession' })
      .populate({ path: 'company', model: 'Company' }),
    Result.find({ student: id })
      .populate({ path: 'session', model: 'InterviewSession' })
      .populate({ path: 'company', model: 'Company' }),
  ]);

  // Index results by session id for O(1) lookup
  const resultBySession = {};
  for (const r of results) {
    resultBySession[String(r.session._id || r.session)] = r;
  }

  // Group by company
  const companyMap = {};

  for (const att of attendances) {
    const company   = att.company;
    const companyId = String(company._id || company);

    if (!companyMap[companyId]) {
      companyMap[companyId] = { company, rounds: {} };
    }

    const roundKey = att.roundNumber;
    if (!companyMap[companyId].rounds[roundKey]) {
      companyMap[companyId].rounds[roundKey] = {
        roundNumber: att.roundNumber,
        session:     att.session,
        attendance:  null,
        result:      null,
      };
    }
    companyMap[companyId].rounds[roundKey].attendance = att;

    // Attach result if available for the same session
    const sessionId = String(att.session._id || att.session);
    if (resultBySession[sessionId]) {
      companyMap[companyId].rounds[roundKey].result = resultBySession[sessionId];
    }
  }

  // Convert to sorted arrays
  const timeline = Object.values(companyMap).map(({ company, rounds }) => ({
    company,
    rounds: Object.values(rounds).sort((a, b) => a.roundNumber - b.roundNumber),
  }));

  return { student, timeline };
}

module.exports = {
  createStudent,
  listStudents,
  getStudentById,
  updateStudent,
  softDeleteStudent,
  getStudentTimeline,
  invalidateStudentCache,
};
