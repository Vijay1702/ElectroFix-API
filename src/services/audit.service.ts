import prisma from '../config/prisma.config';

export const logAction = async (
  userId: string | null,
  menuName: string,
  action: string,
  description: string,
  referenceId?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        menuName,
        action,
        description,
        referenceId
      }
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};

export const getAuditLogs = async (
  pagination: { skip: number; take: number },
  filters?: { menuName?: string; action?: string; startDate?: string; endDate?: string }
) => {
  const where: any = {};

  if (filters?.menuName) {
    where.menuName = filters.menuName;
  }
  
  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate + 'T00:00:00.000Z');
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { fullName: true, email: true }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return { logs, total };
};
