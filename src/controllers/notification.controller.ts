import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { AuthRequest } from '../types/express.d';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notifications = await notificationService.getNotifications(userId);
    return successResponse(res, notifications, MESSAGES.NOTIFICATION.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notification = await notificationService.markAsRead(req.params.id as string, userId);
    return successResponse(res, notification, MESSAGES.NOTIFICATION.MARKED_READ);
  } catch (error) {
    next(error);
  }
};
