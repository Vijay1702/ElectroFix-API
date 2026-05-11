import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // UNCONDITIONAL DEVELOPMENT BYPASS
  req.user = { id: 'a3611f82-3faa-476d-8e77-b0c7d807cc77', email: 'admin@electrofix.com', role: 'ADMIN' } as any;
  next();
};
