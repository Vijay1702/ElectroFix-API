import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { AuthRequest } from '../types/express.d';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, result, MESSAGES.AUTH.LOGIN_SUCCESS);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real application with token blacklisting, you would handle it here.
    // For now, we just return success.
    return successResponse(res, null, MESSAGES.AUTH.LOGOUT_SUCCESS);
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await authService.getProfile(userId);
    return successResponse(res, user, MESSAGES.USER.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    return successResponse(res, result, MESSAGES.AUTH.REFRESH_SUCCESS);
  } catch (error) {
    next(error);
  }
};
