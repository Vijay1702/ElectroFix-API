import { Prisma, Payment } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<(Payment & { invoice: any; user: any }) | null> => {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: {
        include: { customer: true },
      },
      user: { select: { id: true, fullName: true } },
    },
  });
};

export const create = async (data: Prisma.PaymentCreateInput): Promise<Payment> => {
  return prisma.payment.create({
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.PaymentWhereInput }): Promise<Payment[]> => {
  return prisma.payment.findMany({
    ...params,
    include: {
      invoice: {
        include: { customer: true },
      },
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.PaymentWhereInput): Promise<number> => {
  return prisma.payment.count({ where });
};
