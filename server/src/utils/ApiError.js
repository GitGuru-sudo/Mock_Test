'use strict';

/**
 * Custom operational error class.
 * Used to signal expected, user-facing errors (4xx) distinct from
 * unexpected programmer errors (5xx).
 */
class ApiError extends Error {
  /**
   * @param {number}   statusCode - HTTP status code to send to the client.
   * @param {string}   message    - Human-readable error message.
   * @param {Array}    errors     - Optional array of field-level error details.
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
  }
}

module.exports = ApiError;
