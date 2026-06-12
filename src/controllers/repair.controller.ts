import { Request, Response, NextFunction } from 'express';
import * as repairService from '../services/repair.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';
import * as auditService from '../services/audit.service';

export const getRepairJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { search, status, startDate, endDate } = req.query;
    const { repairs, total } = await repairService.getRepairJobs(
      pagination, 
      { search: search as string, status: status as string, startDate: startDate as string, endDate: endDate as string },
      req.user
    );
    const limit = pagination.all ? total : pagination.limit;
    return paginatedResponse(res, repairs, total, pagination.page, limit, MESSAGES.REPAIR.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRepairJobById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repair = await repairService.getRepairJobById(req.params.id as string);
    return successResponse(res, repair, MESSAGES.REPAIR.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createRepairJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const repair = await repairService.createRepairJob(req.body, userId);
    await auditService.logAction(userId, 'Repairs', 'CREATE', `Created repair job #${repair.jobNumber}`, repair.id);
    return successResponse(res, repair, MESSAGES.REPAIR.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateRepairJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const repair = await repairService.updateRepairJob(req.params.id as string, req.body, userId);
    await auditService.logAction(userId, 'Repairs', 'UPDATE', `Updated repair job #${repair.jobNumber}`, repair.id);
    return successResponse(res, repair, MESSAGES.REPAIR.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const updateRepairStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const repair = await repairService.updateRepairStatus(req.params.id as string, req.body, userId);
    await auditService.logAction(userId, 'Repairs', 'UPDATE', `Updated status of repair job #${repair.jobNumber} to ${repair.status}`, repair.id);
    return successResponse(res, repair, MESSAGES.REPAIR.STATUS_UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteRepairJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const repairId = req.params.id as string;
    await repairService.deleteRepairJob(repairId);
    await auditService.logAction(req.user?.id || null, 'Repairs', 'DELETE', `Deleted repair job with ID ${repairId}`, repairId);
    return successResponse(res, null, MESSAGES.REPAIR.DELETED);
  } catch (error) {
    next(error);
  }
};

export const getRepairTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeline = await repairService.getRepairTimeline(req.params.id as string);
    return successResponse(res, timeline, MESSAGES.REPAIR.TIMELINE_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const uploadRepairImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw { statusCode: 400, message: 'No file uploaded' };
    }
    const fileUrl = `/uploads/repairs/${req.file.filename}`;
    // In a real app, you would save this to the FileUpload table and link it to the repair job
    return successResponse(res, { fileUrl }, MESSAGES.REPAIR.IMAGE_UPLOADED);
  } catch (error) {
    next(error);
  }
};
