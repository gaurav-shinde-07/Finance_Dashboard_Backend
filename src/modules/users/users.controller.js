// src/modules/users/users.controller.js
import * as usersService from './users.service.js';
import { sendSuccess, sendError, sendNotFound, buildPagination } from '../../utils/apiResponse.js';
import { parsePagination } from '../../utils/validators.js';
import { validationResult } from 'express-validator';

export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, role, is_active } = req.query;

    const { users, total } = await usersService.getAllUsers({
      page, limit, offset, search, role, is_active,
    });

    const pagination = buildPagination(total, page, limit);
    return sendSuccess(res, 'Users fetched successfully', users, 200, pagination);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    return sendSuccess(res, 'User fetched successfully', user);
  } catch (error) {
    return sendNotFound(res, 'User');
  }
};

export const updateUserRole = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    // Prevent admins from changing their own role (safety guard)
    if (req.params.id === req.user.id) {
      return sendError(res, 'You cannot change your own role', 400);
    }

    const updated = await usersService.updateUserRole(req.params.id, req.body.role);
    return sendSuccess(res, `User role updated to ${req.body.role}`, updated);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const setUserActiveStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    // Prevent admins from deactivating themselves
    if (req.params.id === req.user.id) {
      return sendError(res, 'You cannot deactivate your own account', 400);
    }

    const { is_active } = req.body;
    const updated = await usersService.setUserActiveStatus(req.params.id, is_active);
    const status = is_active ? 'activated' : 'deactivated';
    return sendSuccess(res, `User account ${status} successfully`, updated);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return sendError(res, 'You cannot delete your own account', 400);
    }

    await usersService.deleteUser(req.params.id);
    return sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    return sendError(res, error.message);
  }
};