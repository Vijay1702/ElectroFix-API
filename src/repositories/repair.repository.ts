import { Prisma, RepairJob, RepairStatusHistory } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<(RepairJob & { customer: any; technician: any; statusHistory: any[] }) | null> => {
  return prisma.repairJob.findUnique({
    where: { id },
    include: {
      customer: true,
      technician: {
        select: { id: true, fullName: true, email: true },
      },
      statusHistory: {
        include: {
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

export const create = async (data: Prisma.RepairJobCreateInput): Promise<RepairJob> => {
  return prisma.repairJob.create({
    data,
  });
};

export const update = async (id: string, data: Prisma.RepairJobUpdateInput): Promise<RepairJob> => {
  return prisma.repairJob.update({
    where: { id },
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.RepairJobWhereInput }): Promise<RepairJob[]> => {
  return prisma.repairJob.findMany({
    ...params,
    include: {
      customer: true,
      technician: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.RepairJobWhereInput): Promise<number> => {
  return prisma.repairJob.count({ where });
};

export const remove = async (id: string): Promise<RepairJob> => {
  return prisma.repairJob.delete({
    where: { id },
  });
};

export const addStatusHistory = async (data: Prisma.RepairStatusHistoryCreateInput): Promise<RepairStatusHistory> => {
  return prisma.repairStatusHistory.create({
    data,
  });
};

export const getTimeline = async (repairJobId: string) => {
  return prisma.repairStatusHistory.findMany({
    where: { repairJobId },
    include: {
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};
