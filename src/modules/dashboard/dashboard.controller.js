// src/modules/dashboard/dashboard.controller.js
import * as dashboardService from './dashboard.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

export const getSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getSummary(req.user, req.query);
    return sendSuccess(res, 'Dashboard summary fetched successfully', summary);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getCategoryBreakdown = async (req, res) => {
  try {
    const breakdown = await dashboardService.getCategoryBreakdown(req.user, req.query);
    return sendSuccess(res, 'Category breakdown fetched successfully', breakdown);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getMonthlyTrends = async (req, res) => {
  try {
    const trends = await dashboardService.getMonthlyTrends(req.user, req.query.months);
    return sendSuccess(res, 'Monthly trends fetched successfully', trends);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getWeeklyTrends = async (req, res) => {
  try {
    const trends = await dashboardService.getWeeklyTrends(req.user, req.query.weeks);
    return sendSuccess(res, 'Weekly trends fetched successfully', trends);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const activity = await dashboardService.getRecentActivity(req.user, req.query.limit);
    return sendSuccess(res, 'Recent activity fetched successfully', activity);
  } catch (error) {
    return sendError(res, error.message);
  }
};