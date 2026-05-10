import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { payments, total } = await paymentService.getPayments(pagination);
    return paginatedResponse(res, payments, total, pagination.page, pagination.limit, MESSAGES.PAYMENT.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id as string);
    return successResponse(res, payment, MESSAGES.PAYMENT.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const payment = await paymentService.createPayment(req.body, userId);
    return successResponse(res, payment, MESSAGES.PAYMENT.CREATED, 201);
  } catch (error) {
    next(error);
  }
};
