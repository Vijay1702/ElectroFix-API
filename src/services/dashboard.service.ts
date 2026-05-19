import prisma from '../config/prisma.config';
import { REPAIR_STATUS } from '../constants/repair-status.constants';

export const getSummary = async (currentUser: any) => {
  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const repairWhere: any = {};
  if (currentUser?.role !== 'ADMIN') {
    repairWhere.technicianId = currentUser?.id;
  }

  const [
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales,
    monthlySales,
    lowStockCount,
    activeRepairs,
    notStartedRepairs,
    attendances
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.repairJob.count({ where: repairWhere }),
    prisma.repairJob.count({
      where: {
        ...repairWhere,
        status: {
          in: [REPAIR_STATUS.NOT_STARTED, REPAIR_STATUS.WORK_IN_PROGRESS, REPAIR_STATUS.PENDING_TO_DELIVER],
        },
      },
    }),
    prisma.repairJob.count({
      where: { 
        ...repairWhere,
        status: {
          in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed']
        }
      },
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
          lte: prisma.product.fields.minimumStock,
        },
      },
    }),
    prisma.repairJob.count({
      where: {
        ...repairWhere,
        status: {
          in: ['work_in_progress', 'IN_PROGRESS', 'in_progress', 'WORK_IN_PROGRESS'],
        },
      },
    }),
    prisma.repairJob.count({
      where: {
        ...repairWhere,
        status: {
          in: ['not_started', 'PENDING', 'pending', 'NOT_STARTED'],
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: firstDayOfMonth,
        },
        status: 'Present',
      },
      include: {
        employee: {
          select: {
            perDaySalary: true,
          },
        },
      },
    }),
  ]);

  const totalSalaries = attendances.reduce((acc, curr) => {
    return acc + (Number(curr.employee?.perDaySalary) || 0);
  }, 0);

  const monthlyGross = Number(monthlySales._sum.grandTotal || 0);
  const monthlyRevenue = monthlyGross - totalSalaries;

  return {
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales: totalSales._sum.grandTotal || 0,
    monthlyRevenue,
    monthlyGross,
    lowStockCount,
    activeRepairs,
    notStartedRepairs,
    totalProducts: await prisma.product.count(),
    completedToday: await prisma.repairJob.count({
      where: { 
        ...repairWhere,
        status: {
          in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed']
        },
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

export const getRecentRepairs = async (currentUser: any, limit: number = 5) => {
  const where: any = {};
  if (currentUser?.role !== 'ADMIN') {
    where.technicianId = currentUser?.id;
  }

  return prisma.repairJob.findMany({
    take: limit,
    where,
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
