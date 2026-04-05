// src/modules/auth/auth.controller.js
// ============================================================
// Authentication Controller
//
// Thin layer between routes and service.
// Responsibilities: parse request, call service, send response.
// No business logic here — that's auth.service.js's job.
// ============================================================

import * as authService from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { validationResult } from 'express-validator';

export const register = async (req, res) => {
  // Check for validation errors from express-validator middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const { email, password, full_name } = req.body;
    const result = await authService.registerUser({ email, password, full_name });
    return sendSuccess(res, 'Registration successful. Welcome!', result, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    return sendSuccess(res, 'Login successful', result);
  } catch (error) {
    // 401 for auth failures — client knows to redirect to login
    return sendError(res, error.message, 401);
  }
};

export const logout = async (req, res) => {
  try {
    // Extract token to pass to service for invalidation
    const token = req.headers.authorization.split(' ')[1];
    await authService.logoutUser(token);
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await authService.getMyProfile(req.user.id);
    return sendSuccess(res, 'Profile fetched successfully', profile);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const { full_name } = req.body;
    const updated = await authService.updateMyProfile(req.user.id, { full_name });
    return sendSuccess(res, 'Profile updated successfully', updated);
  } catch (error) {
    return sendError(res, error.message);
  }
};