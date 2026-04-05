// src/utils/validators.js
// ============================================================
// Shared Validation Constants and Helpers
//
// Centralizing validation rules means a change in one place
// applies everywhere. E.g., if valid categories change,
// we update this file only.
// ============================================================

// Valid financial categories — keeps data clean and consistent
// Admins can conceptually extend this; for now it's a fixed set
export const VALID_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Rent',
  'Utilities',
  'Groceries',
  'Healthcare',
  'Entertainment',
  'Marketing',
  'Operations',
  'Travel',
  'Education',
  'Other',
];

export const VALID_ROLES = ['viewer', 'analyst', 'admin'];
export const VALID_RECORD_TYPES = ['income', 'expense'];

/**
 * Parse and validate pagination query parameters
 * Ensures page and limit are valid positive integers within bounds
 */
export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20)); // Cap at 100 per page
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Parse date range filter from query params
 * Returns null for each bound if not provided or invalid
 */
export const parseDateRange = (query) => {
  const startDate = query.start_date && isValidDate(query.start_date)
    ? query.start_date
    : null;
  const endDate = query.end_date && isValidDate(query.end_date)
    ? query.end_date
    : null;
  return { startDate, endDate };
};

/**
 * Validate a date string in YYYY-MM-DD format
 */
export const isValidDate = (dateStr) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};