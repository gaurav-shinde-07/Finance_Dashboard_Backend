// src/modules/records/records.validator.js
// ============================================================
// Records Validation Rules
//
// Separating validation from routes keeps route files clean.
// express-validator chains are readable and composable.
// ============================================================

import { body, query } from 'express-validator';
import { VALID_CATEGORIES, VALID_RECORD_TYPES } from '../../utils/validators.js';

export const createRecordValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0')
    .toFloat(),

  body('type')
    .isIn(VALID_RECORD_TYPES)
    .withMessage(`Type must be one of: ${VALID_RECORD_TYPES.join(', ')}`),

  body('category')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('record_date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Record date must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      // Reject future dates beyond 1 year — likely a data entry error
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (date > oneYearFromNow) throw new Error('Record date cannot be more than 1 year in the future');
      return true;
    }),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with at most 10 items')
    .custom((tags) => {
      if (tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('Each tag must be a string under 50 characters');
      }
      return true;
    }),
];

// Update allows partial updates — all fields optional
export const updateRecordValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),

  body('type')
    .optional()
    .isIn(VALID_RECORD_TYPES)
    .withMessage(`Type must be one of: ${VALID_RECORD_TYPES.join(', ')}`),

  body('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('record_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Record date must be in YYYY-MM-DD format'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with at most 10 items'),
];

export const listRecordsValidation = [
  query('type')
    .optional()
    .isIn(VALID_RECORD_TYPES)
    .withMessage(`Type filter must be one of: ${VALID_RECORD_TYPES.join(', ')}`),

  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category filter must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('start_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('start_date must be in YYYY-MM-DD format'),

  query('end_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('end_date must be in YYYY-MM-DD format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];