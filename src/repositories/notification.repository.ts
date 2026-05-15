import prisma from '../config/prisma.config';

export const create = async (data: any) => {
  return prisma.notification.create({
    data
  });
};

export const listByUser = async (userId: string, isRead?: boolean) => {
  const where: any = { userId };
  if (isRead !== undefined) {
    where.isRead = isRead;
  }
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
};

export const markAsRead = async (id: string) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};
