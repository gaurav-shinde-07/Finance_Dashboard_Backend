// src/modules/users/users.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import * as usersController from './users.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { adminOnly } from '../../middleware/rbac.middleware.js';
import { VALID_ROLES } from '../../utils/validators.js';

const router = Router();

// All user management routes require authentication + admin role
router.use(authenticate, adminOnly);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       403:
 *         description: Admin access required
 */
router.get('/', usersController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', usersController.getUserById);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, analyst, admin]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid role or self-modification attempt
 */
router.patch('/:id/role', [
  body('role').isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
], usersController.updateUserRole);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', [
  body('is_active').isBoolean().withMessage('is_active must be a boolean'),
], usersController.setUserActiveStatus);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user permanently (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 */
router.delete('/:id', usersController.deleteUser);

export default router;