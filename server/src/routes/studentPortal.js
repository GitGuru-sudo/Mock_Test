'use strict';

const express = require('express');
const protect = require('../middleware/protect');
const requireStudent = require('../middleware/requireStudent');
const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const ApiError = require('../utils/ApiError');

const router = express.Router();

// All routes require both protect + requireStudent
router.use(protect, requireStudent);

async function resolveStudentRef(req) {
  if (req.user.studentRef) return req.user.studentRef;
  const user = await User.findById(req.user.userId);
  if (!user) return null;
  if (user.studentRef) return user.studentRef;
  const student = await Student.findOne({ email: user.email }).select('_id');
  return student?._id || null;
}

// GET /api/portal/me
router.get('/me', async (req, res, next) => {
  try {
    const studentRef = await resolveStudentRef(req);
    if (!studentRef) throw new ApiError(404, 'Student profile not found');
    const student = await Student.findById(studentRef);
    if (!student) throw new ApiError(404, 'Student profile not found');
    res.json({ success: true, data: student });
  } catch (err) { next(err); }
});

// GET /api/portal/me/attendance
router.get('/me/attendance', async (req, res, next) => {
  try {
    const studentRef = await resolveStudentRef(req);
    if (!studentRef) return res.json({ success: true, data: [] });
    const records = await Attendance.find({ student: studentRef })
      .populate({ path: 'session', populate: { path: 'company', select: 'name' } })
      .sort('-markedAt');
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// GET /api/portal/me/results
router.get('/me/results', async (req, res, next) => {
  try {
    const studentRef = await resolveStudentRef(req);
    if (!studentRef) return res.json({ success: true, data: [] });
    const records = await Result.find({ student: studentRef })
      .populate({ path: 'session', populate: { path: 'company', select: 'name' } })
      .sort('-recordedAt');
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
});

// GET /api/portal/me/timeline
router.get('/me/timeline', async (req, res, next) => {
  try {
    const studentRef = await resolveStudentRef(req);
    if (!studentRef) return res.json({ success: true, data: [] });
    const results = await Result.find({ student: studentRef })
      .populate({ path: 'session', populate: { path: 'company', select: 'name industry ctc' } })
      .sort('createdAt');

    const timeline = {};
    results.forEach((r) => {
      const companyId = r.session?.company?._id;
      if (!companyId) return;
      if (!timeline[companyId]) {
        timeline[companyId] = {
          company: r.session.company,
          rounds: [],
        };
      }
      timeline[companyId].rounds.push({
        roundName: r.roundName,
        outcome: r.outcome,
        remarks: r.remarks,
        date: r.createdAt,
      });
    });

    res.json({ success: true, data: Object.values(timeline) });
  } catch (err) { next(err); }
});

module.exports = router;
