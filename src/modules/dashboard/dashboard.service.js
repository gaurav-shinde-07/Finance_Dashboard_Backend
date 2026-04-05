// src/modules/dashboard/dashboard.service.js
// ============================================================
// Dashboard Analytics Service
//
// This is where the interesting aggregation logic lives.
// Rather than doing math in JavaScript after fetching all records
// (which breaks at scale), we push computation to PostgreSQL.
// Supabase lets us call RPC functions (Postgres functions) for
// complex aggregations — fast, correct, and scales well.
//
// For simpler aggregations, we use Supabase's built-in filtering
// and do the math in JS after a small, focused fetch.
// ============================================================

import { supabaseAdmin } from '../../config/supabase.js';
import { parseDateRange } from '../../utils/validators.js';

/**
 * Get the overall financial summary
 * Optionally scoped to a specific user (for non-admins, always scoped)
 *
 * Returns:
 * - total_income: sum of all income records
 * - total_expenses: sum of all expense records
 * - net_balance: income - expenses
 * - total_records: count of all records
 */
export const getSummary = async (requestingUser, query = {}) => {
  const { startDate, endDate } = parseDateRange(query);

  // Base query — excludes soft deleted records
  let dbQuery = supabaseAdmin
    .from('financial_records')
    .select('amount, type')
    .is('deleted_at', null);

  // Scope: non-admins only see their own data
  if (requestingUser.role !== 'admin') {
    dbQuery = dbQuery.eq('user_id', requestingUser.id);
  }

  if (startDate) dbQuery = dbQuery.gte('record_date', startDate);
  if (endDate) dbQuery = dbQuery.lte('record_date', endDate);

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Failed to fetch summary: ${error.message}`);

  // Aggregate in JS — dataset is small after filtering by user/date
  const summary = data.reduce((acc, record) => {
    const amount = parseFloat(record.amount);
    if (record.type === 'income') {
      acc.total_income += amount;
    } else {
      acc.total_expenses += amount;
    }
    acc.total_records += 1;
    return acc;
  }, { total_income: 0, total_expenses: 0, total_records: 0 });

  summary.net_balance = summary.total_income - summary.total_expenses;

  // Round to 2 decimal places for display
  summary.total_income = Math.round(summary.total_income * 100) / 100;
  summary.total_expenses = Math.round(summary.total_expenses * 100) / 100;
  summary.net_balance = Math.round(summary.net_balance * 100) / 100;

  return summary;
};

/**
 * Get totals grouped by category
 * Useful for pie/bar chart data on the dashboard
 */
export const getCategoryBreakdown = async (requestingUser, query = {}) => {
  const { startDate, endDate } = parseDateRange(query);

  let dbQuery = supabaseAdmin
    .from('financial_records')
    .select('category, type, amount')
    .is('deleted_at', null);

  if (requestingUser.role !== 'admin') {
    dbQuery = dbQuery.eq('user_id', requestingUser.id);
  }

  if (startDate) dbQuery = dbQuery.gte('record_date', startDate);
  if (endDate) dbQuery = dbQuery.lte('record_date', endDate);

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Failed to fetch category breakdown: ${error.message}`);

  // Build a map: { category: { income: X, expense: Y, net: Z } }
  const breakdown = {};
  for (const record of data) {
    const amount = parseFloat(record.amount);
    if (!breakdown[record.category]) {
      breakdown[record.category] = { category: record.category, income: 0, expense: 0, net: 0, count: 0 };
    }
    if (record.type === 'income') {
      breakdown[record.category].income += amount;
    } else {
      breakdown[record.category].expense += amount;
    }
    breakdown[record.category].net = breakdown[record.category].income - breakdown[record.category].expense;
    breakdown[record.category].count += 1;
  }

  // Convert to sorted array (by absolute net value descending)
  return Object.values(breakdown)
    .map(item => ({
      ...item,
      income: Math.round(item.income * 100) / 100,
      expense: Math.round(item.expense * 100) / 100,
      net: Math.round(item.net * 100) / 100,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
};

/**
 * Get monthly trends for the last N months
 * Perfect for line charts showing income vs expense over time
 */
export const getMonthlyTrends = async (requestingUser, months = 6) => {
  // Clamp months between 1 and 24 to prevent abuse
  const safeMonths = Math.min(24, Math.max(1, parseInt(months, 10) || 6));

  // Calculate start date: N months ago from today
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - safeMonths);
  const startDateStr = startDate.toISOString().split('T')[0];

  let dbQuery = supabaseAdmin
    .from('financial_records')
    .select('amount, type, record_date')
    .is('deleted_at', null)
    .gte('record_date', startDateStr)
    .order('record_date', { ascending: true });

  if (requestingUser.role !== 'admin') {
    dbQuery = dbQuery.eq('user_id', requestingUser.id);
  }

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Failed to fetch monthly trends: ${error.message}`);

  // Group by YYYY-MM
  const monthlyMap = {};
  for (const record of data) {
    const month = record.record_date.substring(0, 7); // "2024-01"
    if (!monthlyMap[month]) {
      monthlyMap[month] = { month, income: 0, expense: 0, net: 0, count: 0 };
    }
    const amount = parseFloat(record.amount);
    if (record.type === 'income') {
      monthlyMap[month].income += amount;
    } else {
      monthlyMap[month].expense += amount;
    }
    monthlyMap[month].net = monthlyMap[month].income - monthlyMap[month].expense;
    monthlyMap[month].count += 1;
  }

  return Object.values(monthlyMap)
    .map(item => ({
      ...item,
      income: Math.round(item.income * 100) / 100,
      expense: Math.round(item.expense * 100) / 100,
      net: Math.round(item.net * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Get recent transactions for activity feed
 */
export const getRecentActivity = async (requestingUser, limit = 10) => {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  let dbQuery = supabaseAdmin
    .from('financial_records')
    .select('id, amount, type, category, description, record_date, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (requestingUser.role !== 'admin') {
    dbQuery = dbQuery.eq('user_id', requestingUser.id);
  }

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Failed to fetch recent activity: ${error.message}`);

  return data;
};

/**
 * Get weekly trends for the last N weeks
 */
export const getWeeklyTrends = async (requestingUser, weeks = 8) => {
  const safeWeeks = Math.min(52, Math.max(1, parseInt(weeks, 10) || 8));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - safeWeeks * 7);
  const startDateStr = startDate.toISOString().split('T')[0];

  let dbQuery = supabaseAdmin
    .from('financial_records')
    .select('amount, type, record_date')
    .is('deleted_at', null)
    .gte('record_date', startDateStr)
    .order('record_date', { ascending: true });

  if (requestingUser.role !== 'admin') {
    dbQuery = dbQuery.eq('user_id', requestingUser.id);
  }

  const { data, error } = await dbQuery;
  if (error) throw new Error(`Failed to fetch weekly trends: ${error.message}`);

  // Group by ISO week number (YYYY-WNN format)
  const weeklyMap = {};
  for (const record of data) {
    const date = new Date(record.record_date);
    const weekKey = getISOWeekKey(date);

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { week: weekKey, income: 0, expense: 0, net: 0, count: 0 };
    }
    const amount = parseFloat(record.amount);
    if (record.type === 'income') {
      weeklyMap[weekKey].income += amount;
    } else {
      weeklyMap[weekKey].expense += amount;
    }
    weeklyMap[weekKey].net = weeklyMap[weekKey].income - weeklyMap[weekKey].expense;
    weeklyMap[weekKey].count += 1;
  }

  return Object.values(weeklyMap)
    .map(item => ({
      ...item,
      income: Math.round(item.income * 100) / 100,
      expense: Math.round(item.expense * 100) / 100,
      net: Math.round(item.net * 100) / 100,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
};

/**
 * Helper: Get ISO week key in format "2024-W03"
 */
const getISOWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};