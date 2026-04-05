// src/modules/users/users.service.js
// ============================================================
// User Management Service (Admin Only)
//
// These operations are only accessible to admins.
// We use supabaseAdmin throughout to bypass RLS — this is
// intentional since admins need to see all users.
// ============================================================

import { supabaseAdmin } from '../../config/supabase.js';
import { VALID_ROLES } from '../../utils/validators.js';

/**
 * Get all users with optional search and pagination
 */
export const getAllUsers = async ({ page, limit, offset, search, role, is_active }) => {
  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' });

  // Apply search filter on name or email
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Filter by role if specified
  if (role && VALID_ROLES.includes(role)) {
    query = query.eq('role', role);
  }

  // Filter by active status if specified
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true');
  }

  // Apply pagination and ordering
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);

  return { users: data, total: count };
};

/**
 * Get a specific user by ID
 */
export const getUserById = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error('User not found');
  return data;
};

/**
 * Update a user's role
 * Only admins can do this — enforced at route level via RBAC middleware
 */
export const updateUserRole = async (userId, newRole) => {
  if (!VALID_ROLES.includes(newRole)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update role: ${error.message}`);
  if (!data) throw new Error('User not found');

  return data;
};

/**
 * Toggle user active status (activate/deactivate)
 * Deactivated users are rejected in auth middleware
 */
export const setUserActiveStatus = async (userId, is_active) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user status: ${error.message}`);
  if (!data) throw new Error('User not found');

  return data;
};

/**
 * Delete a user completely (admin action)
 * This deletes from auth.users which cascades to profiles
 * Use with caution — financial records will also cascade delete
 */
export const deleteUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  return true;
};