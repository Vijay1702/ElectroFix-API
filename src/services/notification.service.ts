import * as notificationRepository from '../repositories/notification.repository';

export const getMyNotifications = async (userId: string) => {
  return notificationRepository.listByUser(userId);
};

export const getUnreadNotifications = async (userId: string) => {
  return notificationRepository.listByUser(userId, false);
};

export const markRead = async (id: string) => {
  return notificationRepository.markAsRead(id);
};

export const markAllRead = async (userId: string) => {
  return notificationRepository.markAllAsRead(userId);
};

export const createNotification = async (userId: string, title: string, message: string, type: string = 'info') => {
  return notificationRepository.create({
    userId,
    title,
    message,
    type
  });
};
