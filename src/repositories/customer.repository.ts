import { Prisma, Customer } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<Customer | null> => {
  return prisma.customer.findUnique({
    where: { id },
  });
};

export const create = async (data: Prisma.CustomerCreateInput): Promise<Customer> => {
  return prisma.customer.create({
    data,
  });
};

export const update = async (id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> => {
  return prisma.customer.update({
    where: { id },
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.CustomerWhereInput }): Promise<Customer[]> => {
  return prisma.customer.findMany({
    ...params,
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.CustomerWhereInput): Promise<number> => {
  return prisma.customer.count({ where });
};

export const remove = async (id: string): Promise<Customer> => {
  return prisma.customer.delete({
    where: { id },
  });
};

export const getHistory = async (id: string) => {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      repairJobs: {
        orderBy: { createdAt: 'desc' },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};
