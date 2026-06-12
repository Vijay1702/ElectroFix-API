import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { AuthRequest } from '../types/express.d';

export const getSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await dashboardService.getSummary(
      req.user, 
      startDate as string, 
      endDate as string
    );
    return successResponse(res, summary, MESSAGES.DASHBOARD.SUMMARY_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRecentRepairs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const { startDate, endDate } = req.query;
    const repairs = await dashboardService.getRecentRepairs(req.user, limit, startDate as string, endDate as string);
    return successResponse(res, repairs, MESSAGES.DASHBOARD.RECENT_REPAIRS_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRecentSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const { startDate, endDate } = req.query;
    const sales = await dashboardService.getRecentSales(limit, startDate as string, endDate as string);
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
    const { startDate, endDate } = req.query;
    const workload = await dashboardService.getTechnicianWorkload(startDate as string, endDate as string);
    return successResponse(res, workload, "Technician workload fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getWeeklyPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const performance = await dashboardService.getWeeklyPerformance(startDate as string, endDate as string);
    return successResponse(res, performance, "Weekly performance fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 5;
    const products = await dashboardService.getTopProducts(limitNum, startDate as string, endDate as string);
    return successResponse(res, products, "Top products fetched successfully");
  } catch (error) {
    next(error);
  }
};
