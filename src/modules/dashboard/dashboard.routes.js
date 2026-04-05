// src/modules/dashboard/dashboard.routes.js
import { Router } from 'express';
import * as dashboardController from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { analystAndAbove, anyRole } from '../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Analytics and summary data for the finance dashboard
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get financial summary (income, expenses, net balance)
 *     description: Viewers see their own summary. Admins see system-wide totals.
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_income: { type: number }
 *                 total_expenses: { type: number }
 *                 net_balance: { type: number }
 *                 total_records: { type: integer }
 */
router.get('/summary', anyRole, dashboardController.getSummary);

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get spending/income breakdown by category (Analyst and Admin)
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category totals array sorted by net value
 */
router.get('/categories', analystAndAbove, dashboardController.getCategoryBreakdown);

/**
 * @swagger
 * /api/dashboard/trends/monthly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get monthly income vs expense trends (Analyst and Admin)
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, minimum: 1, maximum: 24 }
 *         description: Number of past months to include
 *     responses:
 *       200:
 *         description: Monthly trends data for charting
 */
router.get('/trends/monthly', analystAndAbove, dashboardController.getMonthlyTrends);

/**
 * @swagger
 * /api/dashboard/trends/weekly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get weekly income vs expense trends (Analyst and Admin)
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema: { type: integer, default: 8, minimum: 1, maximum: 52 }
 *     responses:
 *       200:
 *         description: Weekly trends data for charting
 */
router.get('/trends/weekly', analystAndAbove, dashboardController.getWeeklyTrends);

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent transaction activity feed
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Recent transactions list
 */
router.get('/activity', anyRole, dashboardController.getRecentActivity);

export default router;