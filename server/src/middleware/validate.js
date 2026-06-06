'use strict';

const { validationResult } = require('express-validator');

/**
 * Express middleware that checks for validation errors produced by
 * express-validator chains run before it in the route handler stack.
 *
 * On failure:
 *   HTTP 422  { success: false, message: 'Validation failed', errors: [...] }
 *
 * On success:
 *   Calls next() to continue to the next middleware / controller.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => e.msg),
    });
  }

  next();
}

module.exports = validate;
