'use strict';

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * Authentication middleware.
 * Validates the Bearer token from the Authorization header and attaches
 * the decoded user payload to `req.user`.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function protect(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Not authorized, no token'));
  }

  const token = authorization.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role, studentRef: decoded.studentRef || null };
    return next();
  } catch (err) {
    // JsonWebTokenError and TokenExpiredError are handled in errorHandler.js
    return next(err);
  }
}

module.exports = protect;
