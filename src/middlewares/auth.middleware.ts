import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { MESSAGES } from '../constants/messages.constants';
import { errorResponse } from '../utils/response';
import { AuthRequest, AuthUser } from '../types/express.d';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // DEVELOPMENT BYPASS
    if (process.env.NODE_ENV !== 'production') {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const adminUser = await prisma.user.findFirst({ where: { email: 'admin@electrofix.com' } });
      if (adminUser) {
        req.user = { id: adminUser.id, email: adminUser.email } as any;
        return next();
      }
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, MESSAGES.AUTH.TOKEN_REQUIRED, 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, MESSAGES.AUTH.TOKEN_REQUIRED, 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return errorResponse(res, MESSAGES.AUTH.TOKEN_EXPIRED, 401);
    }
    return errorResponse(res, MESSAGES.AUTH.TOKEN_INVALID, 401);
  }
};
