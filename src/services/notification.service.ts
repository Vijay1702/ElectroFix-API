import prisma from '../config/prisma.config';
import { MESSAGES } from '../constants/messages.constants';

export const getNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw { statusCode: 404, message: MESSAGES.NOTIFICATION.NOT_FOUND };
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

export const createNotification = async (userId: string, title: string, message: string, type: string = 'info') => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
};
