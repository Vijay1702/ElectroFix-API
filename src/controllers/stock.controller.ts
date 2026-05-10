import { Request, Response, NextFunction } from 'express';
import * as stockService from '../services/stock.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';

export const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { movements, total } = await stockService.getStockMovements(pagination);
    return paginatedResponse(res, movements, total, pagination.page, pagination.limit, MESSAGES.STOCK.MOVEMENTS_FETCHED);
  } catch (error) {
    next(error);
  }
};

export const createStockMovement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const movement = await stockService.createStockMovement(req.body, userId);
    return successResponse(res, movement, MESSAGES.STOCK.MOVEMENT_CREATED, 201);
  } catch (error) {
    next(error);
  }
};
