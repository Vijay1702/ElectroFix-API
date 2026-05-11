import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // UNCONDITIONAL DEVELOPMENT BYPASS
  req.user = { id: 'dev-id', email: 'admin@electrofix.com' } as any;
  return next();
};
