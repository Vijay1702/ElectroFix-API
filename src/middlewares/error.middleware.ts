import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';
import { MESSAGES } from '../constants/messages.constants';
import { errorResponse } from '../utils/response';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || MESSAGES.GENERAL.INTERNAL_ERROR;
  const errors = err.errors || [];

  return errorResponse(res, message, statusCode, errors);
};
