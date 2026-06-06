'use strict';

const companyService = require('../services/companyService');

/**
 * POST /api/companies
 */
async function createCompany(req, res, next) {
  try {
    const company = await companyService.createCompany(req.body);
    return res.status(201).json({
      success: true,
      message: 'Company created',
      data:    { company },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/companies
 */
async function listCompanies(req, res, next) {
  try {
    const companies = await companyService.listCompanies();
    return res.status(200).json({
      success: true,
      message: 'Companies fetched',
      data:    companies,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/companies/:id
 */
async function getCompany(req, res, next) {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Company fetched',
      data:    { company },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/companies/:id
 */
async function updateCompany(req, res, next) {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Company updated',
      data:    { company },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/companies/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    const company = await companyService.updateRecruitmentStatus(
      req.params.id,
      req.body.recruitmentStatus
    );
    return res.status(200).json({
      success: true,
      message: 'Status updated',
      data:    { company },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/companies/:id
 */
async function deleteCompany(req, res, next) {
  try {
    const company = await companyService.deleteCompany(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Company deleted',
      data:    { company },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createCompany, listCompanies, getCompany, updateCompany, deleteCompany, updateStatus };
