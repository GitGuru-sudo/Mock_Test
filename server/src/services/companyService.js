'use strict';

const Company  = require('../models/Company');
const redis    = require('../config/redis');
const ApiError = require('../utils/ApiError');

const CACHE_KEY = 'company:list';

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new company. Rounds array must have at least one entry.
 */
async function createCompany(data) {
  if (!data.rounds || data.rounds.length === 0) {
    throw new ApiError(400, 'At least one round is required');
  }

  const company = await Company.create(data);
  await redis?.del(CACHE_KEY);
  return company;
}

/**
 * List all companies, sorted newest-first. Cached for 60 seconds.
 */
async function listCompanies() {
  const cached = await redis?.get(CACHE_KEY);
  if (cached) {
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  }

  const companies = await Company.find().sort({ createdAt: -1 });
  await redis?.set(CACHE_KEY, JSON.stringify(companies), { ex: 60 });
  return companies;
}

/**
 * Fetch a single company by id.
 */
async function getCompanyById(id) {
  const company = await Company.findById(id);
  if (!company) throw new ApiError(404, 'Company not found');
  return company;
}

/**
 * Update arbitrary company fields.
 */
async function updateCompany(id, data) {
  const company = await Company.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!company) throw new ApiError(404, 'Company not found');

  await redis?.del(CACHE_KEY);
  return company;
}

/**
 * Delete a company.
 */
async function deleteCompany(id) {
  const company = await Company.findByIdAndDelete(id);
  if (!company) throw new ApiError(404, 'Company not found');

  await redis?.del(CACHE_KEY);
  return company;
}

/**
 * Update only the recruitmentStatus of a company.
 */
async function updateRecruitmentStatus(id, status) {
  const company = await Company.findByIdAndUpdate(
    id,
    { recruitmentStatus: status },
    { new: true, runValidators: true }
  );
  if (!company) throw new ApiError(404, 'Company not found');

  await redis?.del(CACHE_KEY);
  return company;
}

module.exports = {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  updateRecruitmentStatus,
};
