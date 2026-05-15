import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../types/express.d';

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.getMyNotifications(req.user!.id);
    return successResponse(res, notifications, "Notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user!.id);
    return successResponse(res, { count: notifications.length, notifications }, "Unread notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markRead(req.params.id as string);
    return successResponse(res, null, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.id);
    return successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};
