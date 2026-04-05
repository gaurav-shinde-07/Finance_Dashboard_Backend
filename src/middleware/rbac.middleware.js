// src/middleware/rbac.middleware.js
// ============================================================
// Role-Based Access Control (RBAC) Middleware
//
// This is the enforcer. After authentication tells us WHO the user is,
// RBAC tells us WHAT they're allowed to do.
//
// Usage in routes:
//   router.post('/records', authenticate, requireRole(['admin', 'analyst']), createRecord)
//   router.delete('/records/:id', authenticate, requireRole(['admin']), deleteRecord)
//
// Role hierarchy (for reference):
//   viewer   → read-only access to their own records and dashboard
//   analyst  → viewer + access to system-wide summaries and insights
//   admin    → full access: create/update/delete records + manage users
// ============================================================

import { sendForbidden } from '../utils/apiResponse.js';

/**
 * Factory function that returns a middleware checking if the
 * authenticated user has one of the allowed roles.
 *
 * @param {string[]} allowedRoles - Array of roles permitted for this route
 * @returns Express middleware function
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // authenticate middleware must run before this — req.user must exist
    if (!req.user) {
      return sendForbidden(res, 'User context not found. Ensure authentication middleware runs first.');
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      // Log the attempt for monitoring (in production, this would go to a logging service)
      console.warn(`🚫 Access denied: User ${req.user.id} (role: ${userRole}) attempted to access a route requiring [${allowedRoles.join(', ')}]`);

      return sendForbidden(
        res,
        `This action requires one of the following roles: ${allowedRoles.join(', ')}. Your current role is: ${userRole}.`
      );
    }

    next();
  };
};

/**
 * Convenience role guards for common patterns
 * These read more clearly in route definitions
 */

// Only admins
export const adminOnly = requireRole(['admin']);

// Admins and analysts (can read summaries and insights)
export const analystAndAbove = requireRole(['admin', 'analyst']);

// All authenticated users (any role)
export const anyRole = requireRole(['admin', 'analyst', 'viewer']);