'use strict';

const Result = require('../models/Result');

/**
 * Return a filtered list of results flattened into a report-friendly shape.
 *
 * Supported filters:
 *   companyId       – ObjectId / string matching Result.company
 *   branch          – student branch (post-filter after populate)
 *   placementStatus – student placementStatus (post-filter after populate)
 *   fromDate        – ISO date string; results on or after this date
 *   toDate          – ISO date string; results on or before this date
 *
 * @param {Object} [filters={}]
 * @returns {Promise<Array>}
 */
async function getFilteredReport(filters = {}) {
  // Build DB-level query (fields available directly on Result)
  const query = {};

  if (filters.companyId) query.company = filters.companyId;

  if (filters.fromDate || filters.toDate) {
    query.recordedAt = {};
    if (filters.fromDate) query.recordedAt.$gte = new Date(filters.fromDate);
    if (filters.toDate)   query.recordedAt.$lte = new Date(filters.toDate);
  }

  let results = await Result.find(query)
    .populate('student', 'studentId name branch placementStatus')
    .populate('company', 'name')
    .populate('session', 'scheduledDate roundName')
    .sort({ recordedAt: -1 });

  // Post-filter by fields that require populated sub-documents
  if (filters.branch) {
    results = results.filter(r => r.student?.branch === filters.branch);
  }
  if (filters.placementStatus) {
    results = results.filter(r => r.student?.placementStatus === filters.placementStatus);
  }

  // Map to flat report shape
  return results.map(r => ({
    studentId:   r.student?.studentId,
    studentName: r.student?.name,
    branch:      r.student?.branch,
    companyName: r.company?.name,
    roundNumber: r.roundNumber,
    roundName:   r.session?.roundName,
    outcome:     r.outcome,
    remarks:     r.remarks,
    recordedAt:  r.recordedAt,
  }));
}

module.exports = { getFilteredReport };
