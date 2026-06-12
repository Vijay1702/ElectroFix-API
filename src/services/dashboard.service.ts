import prisma from '../config/prisma.config';
import { REPAIR_STATUS } from '../constants/repair-status.constants';

export const getSummary = async (currentUser: any, startDateStr?: string, endDateStr?: string) => {
  const now = new Date();
  let start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  let end = now;

  if (startDateStr) {
    start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
  }
  
  if (endDateStr) {
    end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
  }

  const repairWhere: any = {};
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MONITOR') {
    repairWhere.technicianId = currentUser?.id;
  }

  const [
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales,
    periodSales,
    lowStockCount,
    activeRepairs,
    pendingToDeliverRepairs,
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
      where: { createdAt: { gte: start, lte: end } },
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
          in: [REPAIR_STATUS.NOT_STARTED, REPAIR_STATUS.WORK_IN_PROGRESS],
        },
      },
    }),
    prisma.repairJob.count({
      where: {
        ...repairWhere,
        status: REPAIR_STATUS.PENDING_TO_DELIVER,
      },
    }),
    prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: start,
          lte: end,
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

  const periodGross = Number(periodSales._sum.grandTotal || 0);
  const periodRevenue = periodGross - totalSalaries;

  return {
    totalCustomers,
    totalRepairs,
    pendingRepairs,
    completedRepairs,
    totalSales: totalSales._sum.grandTotal || 0,
    periodRevenue,
    periodGross,
    lowStockCount,
    activeRepairs,
    pendingToDeliverRepairs,
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

export const getTechnicianWorkload = async (startDateStr?: string, endDateStr?: string) => {
  const repairWhere: any = { status: { not: REPAIR_STATUS.DELIVERED } };
  if (startDateStr || endDateStr) {
    repairWhere.createdAt = {};
    if (startDateStr) repairWhere.createdAt.gte = new Date(startDateStr);
    if (endDateStr) {
       const end = new Date(endDateStr);
       end.setHours(23, 59, 59, 999);
       repairWhere.createdAt.lte = end;
    }
  }

  return prisma.user.findMany({
    where: { role: { name: 'TECHNICIAN' } },
    select: {
      id: true,
      fullName: true,
      _count: {
        select: { repairJobs: { where: repairWhere } }
      }
    }
  });
};

export const getRecentRepairs = async (currentUser: any, limit: number = 5, startDateStr?: string, endDateStr?: string) => {
  const where: any = {
    status: {
      in: [REPAIR_STATUS.NOT_STARTED, REPAIR_STATUS.WORK_IN_PROGRESS]
    }
  };
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MONITOR') {
    where.technicianId = currentUser?.id;
  }
  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) where.createdAt.gte = new Date(startDateStr);
    if (endDateStr) {
       const end = new Date(endDateStr);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
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

export const getRecentSales = async (limit: number = 5, startDateStr?: string, endDateStr?: string) => {
  const where: any = {};
  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) where.createdAt.gte = new Date(startDateStr);
    if (endDateStr) {
       const end = new Date(endDateStr);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }
  return prisma.invoice.findMany({
    take: limit,
    where,
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

export const getTopProducts = async (limit: number = 5, startDateStr?: string, endDateStr?: string) => {
  const where: any = { productId: { not: null } };
  
  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) where.createdAt.gte = new Date(startDateStr);
    if (endDateStr) {
       const end = new Date(endDateStr);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  const grouped = await prisma.invoiceItem.groupBy({
    by: ['productId'],
    where,
    _sum: {
      totalPrice: true,
      quantity: true,
    },
    orderBy: {
      _sum: {
        totalPrice: 'desc',
      },
    },
    take: limit,
  });

  const productIds = grouped.map((g: any) => g.productId as string);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, productCode: true, category: { select: { name: true } } }
  });

  return grouped.map((g: any) => {
    const p = products.find(prod => prod.id === g.productId);
    return {
      id: p?.id,
      name: p?.name,
      productCode: p?.productCode,
      category: p?.category?.name,
      totalRevenue: Number(g._sum.totalPrice || 0),
      totalQuantity: Number(g._sum.quantity || 0),
    };
  });
};

export const getWeeklyPerformance = async (startDateStr?: string, endDateStr?: string) => {
  const result = [];
  
  let end = new Date();
  if (endDateStr) {
    end = new Date(endDateStr);
  }
  end.setHours(23, 59, 59, 999);

  let start = new Date(end);
  start.setDate(start.getDate() - 6);
  if (startDateStr) {
    start = new Date(startDateStr);
  }
  start.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatShortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (diffDays <= 1) {
    // 1hr based
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(start);
      hourStart.setHours(i, 0, 0, 0);
      const hourEnd = new Date(start);
      hourEnd.setHours(i, 59, 59, 999);

      const invoices = await prisma.invoice.aggregate({
        where: { createdAt: { gte: hourStart, lte: hourEnd } },
        _sum: { grandTotal: true }
      });
      const repairsCount = await prisma.repairJob.count({
        where: { 
          status: { in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed'] },
          updatedAt: { gte: hourStart, lte: hourEnd }
        }
      });

      const ampm = i >= 12 ? 'PM' : 'AM';
      const hour12 = i % 12 || 12;
      result.push({
        day: `${hour12} ${ampm}`,
        revenue: Number(invoices._sum.grandTotal || 0),
        repairs: repairsCount
      });
    }
  } else if (diffDays <= 7) {
    // day based
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23,59,59,999);
      
      const invoices = await prisma.invoice.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { grandTotal: true }
      });
      const repairsCount = await prisma.repairJob.count({
        where: { 
          status: { in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed'] },
          updatedAt: { gte: dayStart, lte: dayEnd }
        }
      });
      
      result.push({
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: Number(invoices._sum.grandTotal || 0),
        repairs: repairsCount
      });
    }
  } else if (diffDays <= 31) {
    // week based
    let currentStart = new Date(start);
    let weekNum = 1;
    while (currentStart <= end) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);
      if (currentEnd > end) {
        currentEnd = new Date(end);
      }
      currentEnd.setHours(23,59,59,999);
      
      const invoices = await prisma.invoice.aggregate({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
        _sum: { grandTotal: true }
      });
      const repairsCount = await prisma.repairJob.count({
        where: { 
          status: { in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed'] },
          updatedAt: { gte: currentStart, lte: currentEnd }
        }
      });
      
      result.push({
        day: `W${weekNum} [${formatShortDate(currentStart)} - ${formatShortDate(currentEnd)}]`,
        revenue: Number(invoices._sum.grandTotal || 0),
        repairs: repairsCount
      });
      
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
      currentStart.setHours(0,0,0,0);
      weekNum++;
    }
  } else {
    // month based
    let currentYear = start.getFullYear();
    let currentMonth = start.getMonth();
    
    while (new Date(currentYear, currentMonth, 1) <= end) {
      const monthStart = new Date(currentYear, currentMonth, 1);
      if (monthStart < start) monthStart.setTime(start.getTime());
      
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      if (monthEnd > end) monthEnd.setTime(end.getTime());
      monthEnd.setHours(23,59,59,999);
      
      const invoices = await prisma.invoice.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { grandTotal: true }
      });
      const repairsCount = await prisma.repairJob.count({
        where: { 
          status: { in: [REPAIR_STATUS.DELIVERED, 'DELIVERED', 'COMPLETED', 'completed'] },
          updatedAt: { gte: monthStart, lte: monthEnd }
        }
      });
      
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
      result.push({
        day: monthName,
        revenue: Number(invoices._sum.grandTotal || 0),
        repairs: repairsCount
      });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  return result;
};
