import { Prisma, StockMovement } from '@prisma/client';
import prisma from '../config/prisma.config';

export const create = async (data: Prisma.StockMovementCreateInput): Promise<StockMovement> => {
  return prisma.stockMovement.create({
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.StockMovementWhereInput }): Promise<StockMovement[]> => {
  return prisma.stockMovement.findMany({
    ...params,
    include: {
      product: true,
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.StockMovementWhereInput): Promise<number> => {
  return prisma.stockMovement.count({ where });
};
