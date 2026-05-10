import { Response, NextFunction } from 'express';
import { MESSAGES } from '../constants/messages.constants';
import { errorResponse } from '../utils/response';
import { AuthRequest } from '../types/express.d';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, MESSAGES.AUTH.UNAUTHORIZED, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, MESSAGES.AUTH.FORBIDDEN, 403);
    }

    next();
  };
};
