import { Prisma, CallLog } from '@prisma/client';
import prisma from '../config/prisma.config';

export const create = async (data: Prisma.CallLogUncheckedCreateInput): Promise<CallLog> => {
  return prisma.callLog.create({
    data,
  });
};

export const list = async (repairJobId: string): Promise<any[]> => {
  return prisma.callLog.findMany({
    where: { repairJobId },
    include: {
      createdBy: {
        select: { id: true, fullName: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};
