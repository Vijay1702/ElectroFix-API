import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await dashboardService.getSummary();
    return successResponse(res, summary, MESSAGES.DASHBOARD.SUMMARY_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRecentRepairs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const repairs = await dashboardService.getRecentRepairs(limit);
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
