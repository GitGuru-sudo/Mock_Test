'use strict';

/**
 * Global Express error-handling middleware.
 * Must be registered LAST, after all routes.
 *
 * Response shape:
 *   { success: false, message: string, errors: [] }
 *
 * @param {Error}              err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  // required for Express to treat this as error middleware
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // -------------------------------------------------------------------------
  // Mongoose ValidationError — e.g. required fields missing, enum violation
  // -------------------------------------------------------------------------
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // -------------------------------------------------------------------------
  // Mongoose CastError — e.g. invalid ObjectId format
  // -------------------------------------------------------------------------
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      errors: [],
    });
  }

  // -------------------------------------------------------------------------
  // MongoDB duplicate-key error
  // -------------------------------------------------------------------------
  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
      errors: [],
    });
  }

  // -------------------------------------------------------------------------
  // JWT errors
  // -------------------------------------------------------------------------
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errors: [],
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errors: [],
    });
  }

  // -------------------------------------------------------------------------
  // Custom operational ApiError
  // -------------------------------------------------------------------------
  if (err.isOperational === true) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // -------------------------------------------------------------------------
  // Unexpected / programmer errors — do not leak details
  // -------------------------------------------------------------------------
  console.error('[errorHandler] Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [],
  });
}

module.exports = errorHandler;
