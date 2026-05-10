import { Request, Response, NextFunction } from 'express';
import * as repairService from '../services/repair.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';

export const getRepairJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { repairs, total } = await repairService.getRepairJobs(pagination);
    return paginatedResponse(res, repairs, total, pagination.page, pagination.limit, MESSAGES.REPAIR.FETCHED);
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
    return successResponse(res, repair, MESSAGES.REPAIR.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateRepairJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repair = await repairService.updateRepairJob(req.params.id as string, req.body);
    return successResponse(res, repair, MESSAGES.REPAIR.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const updateRepairStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const repair = await repairService.updateRepairStatus(req.params.id as string, req.body, userId);
    return successResponse(res, repair, MESSAGES.REPAIR.STATUS_UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteRepairJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await repairService.deleteRepairJob(req.params.id as string);
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
