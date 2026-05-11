import prisma from '../config/prisma.config';
import { REPAIR_STATUS } from '../constants/repair-status.constants';

export const getSummary = async () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales,
    monthlySales,
    lowStockCount
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
    prisma.invoice.aggregate({
      where: { createdAt: { gte: firstDayOfMonth } },
      _sum: { grandTotal: true },
    }),
    prisma.product.count({
      where: {
        stockQuantity: {
          lte: 10, // Default low stock threshold
        },
      },
    }),
  ]);

  return {
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales: totalSales._sum.grandTotal || 0,
    monthlyRevenue: monthlySales._sum.grandTotal || 0,
    lowStockCount,
    totalProducts: await prisma.product.count(),
    completedToday: await prisma.repairJob.count({
      where: { 
        status: REPAIR_STATUS.DELIVERED,
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    })
  };
};

export const getTechnicianWorkload = async () => {
  return prisma.user.findMany({
    where: { role: { name: 'TECHNICIAN' } },
    select: {
      id: true,
      fullName: true,
      _count: {
        select: { repairJobs: { where: { status: { not: REPAIR_STATUS.DELIVERED } } } }
      }
    }
  });
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
