// src/modules/records/records.routes.js
import { Router } from 'express';
import * as recordsController from './records.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { adminOnly, analystAndAbove, anyRole } from '../../middleware/rbac.middleware.js';
import {
  createRecordValidation,
  updateRecordValidation,
  listRecordsValidation,
} from './records.validator.js';

const router = Router();

// All record routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial records management
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: Get financial records (filtered, paginated)
 *     description: Admins see all records. Viewers and analysts see only their own.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: e.g. Salary, Rent, Marketing
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *         description: Filter from this date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in description and category
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, enum: [record_date, amount, created_at, category], default: record_date }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Records with pagination metadata
 */
router.get('/', anyRole, listRecordsValidation, recordsController.getRecords);

/**
 * @swagger
 * /api/records:
 *   post:
 *     tags: [Records]
 *     summary: Create a financial record (Admin and Analyst only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, record_date]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000.00
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               category:
 *                 type: string
 *                 example: Salary
 *               record_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               description:
 *                 type: string
 *                 example: Monthly salary deposit
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Record created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Viewers cannot create records
 */
router.post('/', analystAndAbove, createRecordValidation, recordsController.createRecord);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a single record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Not found or access denied
 */
router.get('/:id', anyRole, recordsController.getRecordById);

/**
 * @swagger
 * /api/records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record (Admin and Analyst only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FinancialRecord'
 *     responses:
 *       200:
 *         description: Updated record
 *       403:
 *         description: Viewers cannot update records
 *       404:
 *         description: Record not found
 */
router.patch('/:id', analystAndAbove, updateRecordValidation, recordsController.updateRecord);

/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft delete a record (Admin only)
 *     description: Record is marked as deleted but preserved in DB for audit purposes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Record soft deleted
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', adminOnly, recordsController.deleteRecord);

/**
 * @swagger
 * /api/records/{id}/restore:
 *   patch:
 *     tags: [Records]
 *     summary: Restore a soft-deleted record (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Record restored
 */
router.patch('/:id/restore', adminOnly, recordsController.restoreRecord);

export default router;