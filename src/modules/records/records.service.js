// src/modules/records/records.service.js
// ============================================================
// Financial Records Service
//
// The heart of the application. All record operations live here.
//
// Key design decisions:
// - Soft delete: deleted_at timestamp, never hard delete financial data
// - Admins see all records; viewers/analysts see only their own
// - All queries exclude soft-deleted records by default
// - Amount is always stored positive; type (income/expense) determines sign
// ============================================================

import { supabaseAdmin } from '../../config/supabase.js';

/**
 * Create a new financial record
 * @param {string} userId - The authenticated user's ID
 * @param {object} recordData - Record fields from request body
 */
export const createRecord = async (userId, recordData) => {
  const { amount, type, category, description, record_date, tags } = recordData;

  const { data, error } = await supabaseAdmin
    .from('financial_records')
    .insert({
      user_id: userId,
      amount,
      type,
      category,
      description: description || null,
      record_date,
      tags: tags || [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create record: ${error.message}`);
  return data;
};

/**
 * Get records with flexible filtering and pagination
 *
 * Access control logic:
 * - Admin role → can see ALL records across all users
 * - viewer/analyst → can only see their own records
 * This gives admins a system-wide view while protecting user privacy.
 */
export const getRecords = async ({
  requestingUser,
  page,
  limit,
  offset,
  type,
  category,
  start_date,
  end_date,
  search,
  sort_by = 'record_date',
  sort_order = 'desc',
}) => {
  let query = supabaseAdmin
    .from('financial_records')
    .select('*, profiles(full_name, email)', { count: 'exact' })
    // Always exclude soft-deleted records
    .is('deleted_at', null);

  // RBAC: non-admins only see their own records
  if (requestingUser.role !== 'admin') {
    query = query.eq('user_id', requestingUser.id);
  }

  // Filter by transaction type (income/expense)
  if (type) query = query.eq('type', type);

  // Filter by category
  if (category) query = query.eq('category', category);

  // Date range filtering — inclusive on both ends
  if (start_date) query = query.gte('record_date', start_date);
  if (end_date) query = query.lte('record_date', end_date);

  // Text search across description and category
  if (search) {
    query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%`);
  }

  // Validate sort column to prevent injection
  const validSortColumns = ['record_date', 'amount', 'created_at', 'category'];
  const safeSortBy = validSortColumns.includes(sort_by) ? sort_by : 'record_date';
  const ascending = sort_order === 'asc';

  const { data, error, count } = await query
    .order(safeSortBy, { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch records: ${error.message}`);

  return { records: data, total: count };
};

/**
 * Get a single record by ID
 * Access control: non-admins can only access their own record
 */
export const getRecordById = async (recordId, requestingUser) => {
  let query = supabaseAdmin
    .from('financial_records')
    .select('*')
    .eq('id', recordId)
    .is('deleted_at', null);

  // Scope to user's own record unless admin
  if (requestingUser.role !== 'admin') {
    query = query.eq('user_id', requestingUser.id);
  }

  const { data, error } = await query.single();

  if (error || !data) throw new Error('Record not found or access denied');
  return data;
};

/**
 * Update a financial record
 * Analysts and admins can update; viewers cannot (enforced at route level)
 * Non-admins can only update their own records
 */
export const updateRecord = async (recordId, requestingUser, updates) => {
  // First verify the record exists and user has access
  await getRecordById(recordId, requestingUser);

  // Strip undefined fields so we don't overwrite with null accidentally
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(cleanUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabaseAdmin
    .from('financial_records')
    .update(cleanUpdates)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update record: ${error.message}`);
  return data;
};

/**
 * Soft delete a record — sets deleted_at timestamp
 * Only admins can delete records (business rule — financial audit trail)
 * We never hard delete financial records.
 */
export const softDeleteRecord = async (recordId, requestingUser) => {
  // Verify record exists first
  const record = await supabaseAdmin
    .from('financial_records')
    .select('id, deleted_at')
    .eq('id', recordId)
    .single();

  if (!record.data) throw new Error('Record not found');
  if (record.data.deleted_at) throw new Error('Record has already been deleted');

  const { error } = await supabaseAdmin
    .from('financial_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', recordId);

  if (error) throw new Error(`Failed to delete record: ${error.message}`);
  return true;
};

/**
 * Restore a soft-deleted record (admin only)
 */
export const restoreRecord = async (recordId) => {
  const { data, error } = await supabaseAdmin
    .from('financial_records')
    .update({ deleted_at: null })
    .eq('id', recordId)
    .select()
    .single();

  if (error || !data) throw new Error('Record not found or restore failed');
  return data;
};