import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { AuthRequest } from '../types/express.d';

export const getSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await dashboardService.getSummary(req.user);
    return successResponse(res, summary, MESSAGES.DASHBOARD.SUMMARY_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRecentRepairs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const repairs = await dashboardService.getRecentRepairs(req.user, limit);
    return successResponse(res, repairs, MESSAGES.DASHBOARD.RECENT_REPAIRS_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRecentSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const sales = await dashboardService.getRecentSales(limit);
    return successResponse(res, sales, MESSAGES.DASHBOARD.RECENT_SALES_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getLowStockItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const items = await dashboardService.getLowStockItems(limit);
    return successResponse(res, items, MESSAGES.DASHBOARD.LOW_STOCK_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getTechnicianWorkload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workload = await dashboardService.getTechnicianWorkload();
    return successResponse(res, workload, "Technician workload fetched successfully");
  } catch (error) {
    next(error);
  }
};
