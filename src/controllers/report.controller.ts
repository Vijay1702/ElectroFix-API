import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const report = await reportService.getSalesReport(startDate, endDate);
    return successResponse(res, report, MESSAGES.REPORT.SALES_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getRepairsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const report = await reportService.getRepairsReport(startDate, endDate);
    return successResponse(res, report, MESSAGES.REPORT.REPAIRS_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getProductsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.getProductsReport();
    return successResponse(res, report, MESSAGES.REPORT.PRODUCTS_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getPaymentsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const report = await reportService.getPaymentsReport(startDate, endDate);
    return successResponse(res, report, MESSAGES.REPORT.PAYMENTS_FETCHED);
  } catch (error) {
    next(error);
  }
};
