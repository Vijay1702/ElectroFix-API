import { Request, Response, NextFunction } from 'express';
import * as callLogService from '../services/call-log.service';
import { successResponse } from '../utils/response';

export const createCallLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repairJobId = req.params.id as string;
    const { outcome, notes } = req.body;
    const userId = (req as any).user.id;

    const callLog = await callLogService.createCallLog(repairJobId, outcome, notes, userId);
    return successResponse(res, callLog, "Call log added successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const getCallLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repairJobId = req.params.id as string;
    const callLogs = await callLogService.getCallLogs(repairJobId);
    return successResponse(res, callLogs, "Call logs fetched successfully");
  } catch (error) {
    next(error);
  }
};
