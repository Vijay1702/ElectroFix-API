import prisma from '../config/prisma.config';
import { REPAIR_STATUS } from '../constants/repair-status.constants';

export const getSummary = async () => {
  const [
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.repairJob.count(),
    prisma.repairJob.count({
      where: {
        status: {
          in: [REPAIR_STATUS.RECEIVED, REPAIR_STATUS.UNDER_INSPECTION, REPAIR_STATUS.UNDER_REPAIR, REPAIR_STATUS.WAITING_PARTS],
        },
      },
    }),
    prisma.repairJob.count({
      where: { status: REPAIR_STATUS.DELIVERED },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
    }),
  ]);

  return {
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales: totalSales._sum.grandTotal || 0,
  };
};

export const getRecentRepairs = async (limit: number = 5) => {
  return prisma.repairJob.findMany({
    take: limit,
    include: {
      customer: true,
      technician: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getRecentSales = async (limit: number = 5) => {
  return prisma.invoice.findMany({
    take: limit,
    include: {
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getLowStockItems = async (limit: number = 5) => {
  return prisma.product.findMany({
    take: limit,
    where: {
      stockQuantity: {
        lte: prisma.product.fields.minimumStock,
      },
    },
    orderBy: { stockQuantity: 'asc' },
  });
};
