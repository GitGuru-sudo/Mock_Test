'use strict';

const Student          = require('../models/Student');
const Company          = require('../models/Company');
const Result           = require('../models/Result');
const InterviewSession = require('../models/InterviewSession');
const redis            = require('../config/redis');

/**
 * Return aggregated dashboard statistics, served from Redis cache when
 * available (60-second TTL).
 *
 * @returns {Promise<Object>}
 */
async function getStats() {
  // 1. Check Redis cache
  const cached = await redis?.get('dashboard:stats');
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;

  // 2. Run parallel MongoDB aggregations

  // Student status counts (only non-deleted)
  const studentStats = await Student.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$placementStatus', count: { $sum: 1 } } },
  ]);

  // Convert to map: { placed: N, in_process: N, not_placed: N, rejected: N }
  const statusMap = {};
  for (const s of studentStats) statusMap[s._id] = s.count;

  const totalStudents     = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const placedStudents    = statusMap['placed']     || 0;
  const inProcessStudents = statusMap['in_process'] || 0;
  const rejectedStudents  = statusMap['rejected']   || 0;
  const notPlacedStudents = statusMap['not_placed'] || 0;

  // Company stats
  const totalCompanies  = await Company.countDocuments();
  const activeCompanies = await Company.countDocuments({ recruitmentStatus: 'ongoing' });

  // Placement by branch
  const placementByBranch = await Student.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id:    '$branch',
        total:  { $sum: 1 },
        placed: { $sum: { $cond: [{ $eq: ['$placementStatus', 'placed'] }, 1, 0] } },
      },
    },
  ]);

  // Top recruiters (top 5 companies by offer count)
  const topRecruiters = await Result.aggregate([
    { $match: { outcome: 'offer' } },
    { $group: { _id: '$company', offersCount: { $sum: 1 } } },
    { $sort: { offersCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from:         'companies',
        localField:   '_id',
        foreignField: '_id',
        as:           'company',
      },
    },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, company: '$company.name', offersCount: 1 } },
  ]);

  // Today's scheduled sessions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySessions = await InterviewSession.find({
    scheduledDate: { $gte: todayStart, $lte: todayEnd },
    status:        'scheduled',
  }).populate('company', 'name');

  // 3. Build stats object
  const stats = {
    totalStudents,
    placedStudents,
    inProcessStudents,
    rejectedStudents,
    notPlacedStudents,
    totalCompanies,
    activeCompanies,
    todaySessions,
    placementByBranch,
    topRecruiters,
  };

  // 4. Cache with 60 s TTL
  await redis?.set('dashboard:stats', JSON.stringify(stats), { ex: 60 });

  return stats;
}

module.exports = { getStats };
