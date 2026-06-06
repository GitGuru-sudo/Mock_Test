'use strict';

const ApiError = require('../utils/ApiError');

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
}

module.exports = requireAdmin;
