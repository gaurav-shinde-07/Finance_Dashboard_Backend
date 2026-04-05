// src/utils/apiResponse.js
// ============================================================
// Standardized API Response Helper
//
// Every single API response goes through these helpers.
// This guarantees a consistent shape across the entire API:
// { success, message, data, pagination? }
//
// Why this matters: Frontend devs can write one response handler.
// It also makes the API feel polished and professional.
// ============================================================

/**
 * Send a successful response
 * @param {object} res - Express response object
 * @param {string} message - Human-readable success message
 * @param {any} data - Response payload
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {object} pagination - Optional pagination metadata
 */
export const sendSuccess = (res, message, data = null, statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data,
  };

  // Attach pagination metadata if provided (for list endpoints)
  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {array} errors - Detailed validation errors array (optional)
 */
export const sendError = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };

  // Include detailed field-level errors for validation failures
  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Common HTTP error shortcuts — keeps controllers clean and readable
 */
export const sendNotFound = (res, resource = 'Resource') =>
  sendError(res, `${resource} not found`, 404);

export const sendUnauthorized = (res, message = 'Authentication required') =>
  sendError(res, message, 401);

export const sendForbidden = (res, message = 'You do not have permission to perform this action') =>
  sendError(res, message, 403);

export const sendServerError = (res, message = 'Internal server error') =>
  sendError(res, message, 500);

/**
 * Build pagination metadata object
 * @param {number} total - Total record count
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Records per page
 */
export const buildPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});