'use strict';

const studentService = require('../services/studentService');

/**
 * POST /api/students
 */
async function createStudent(req, res, next) {
  try {
    const student = await studentService.createStudent(req.body);
    return res.status(201).json({
      success: true,
      message: 'Student created',
      data:    { student },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/students
 */
async function listStudents(req, res, next) {
  try {
    const { search, branch, placementStatus, year, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (search)          filters.search          = search;
    if (branch)          filters.branch          = branch;
    if (placementStatus) filters.placementStatus  = placementStatus;
    if (year)            filters.year             = year;

    const result = await studentService.listStudents(filters, Number(page), Number(limit));

    return res.status(200).json({
      success:    true,
      message:    'Students fetched',
      data:       result.students,
      pagination: {
        total:      result.total,
        page:       result.page,
        limit:      result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/students/:id
 */
async function getStudent(req, res, next) {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Student fetched',
      data:    { student },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/students/:id
 */
async function updateStudent(req, res, next) {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Student updated',
      data:    { student },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/students/:id
 */
async function deleteStudent(req, res, next) {
  try {
    await studentService.softDeleteStudent(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/students/:id/timeline
 */
async function getStudentTimeline(req, res, next) {
  try {
    const data = await studentService.getStudentTimeline(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Student timeline fetched',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createStudent, listStudents, getStudent, updateStudent, getStudentTimeline, deleteStudent };
