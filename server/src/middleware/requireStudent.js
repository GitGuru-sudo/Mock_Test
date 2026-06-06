'use strict';

const ApiError = require('../utils/ApiError');

function requireStudent(req, res, next) {
  if (req.user.role !== 'student') {
    return next(new ApiError(403, 'Student access required'));
  }
  next();
}

module.exports = requireStudent;
