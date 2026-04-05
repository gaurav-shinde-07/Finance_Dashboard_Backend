// src/modules/records/records.controller.js
import * as recordsService from './records.service.js';
import { sendSuccess, sendError, sendNotFound, buildPagination } from '../../utils/apiResponse.js';
import { parsePagination } from '../../utils/validators.js';
import { validationResult } from 'express-validator';

export const createRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const record = await recordsService.createRecord(req.user.id, req.body);
    return sendSuccess(res, 'Financial record created successfully', record, 201);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getRecords = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { type, category, start_date, end_date, search, sort_by, sort_order } = req.query;

    const { records, total } = await recordsService.getRecords({
      requestingUser: req.user,
      page, limit, offset,
      type, category, start_date, end_date, search, sort_by, sort_order,
    });

    const pagination = buildPagination(total, page, limit);
    return sendSuccess(res, 'Records fetched successfully', records, 200, pagination);
  } catch (error) {
    return sendError(res, error.message);
  }
};

export const getRecordById = async (req, res) => {
  try {
    const record = await recordsService.getRecordById(req.params.id, req.user);
    return sendSuccess(res, 'Record fetched successfully', record);
  } catch (error) {
    return sendNotFound(res, 'Financial record');
  }
};

export const updateRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  try {
    const updated = await recordsService.updateRecord(req.params.id, req.user, req.body);
    return sendSuccess(res, 'Record updated successfully', updated);
  } catch (error) {
    return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
  }
};

export const deleteRecord = async (req, res) => {
  try {
    await recordsService.softDeleteRecord(req.params.id, req.user);
    return sendSuccess(res, 'Record deleted successfully (soft delete — data preserved for audit)');
  } catch (error) {
    return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
  }
};

export const restoreRecord = async (req, res) => {
  try {
    const restored = await recordsService.restoreRecord(req.params.id);
    return sendSuccess(res, 'Record restored successfully', restored);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};