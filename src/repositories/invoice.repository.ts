import { Prisma, Invoice, InvoiceItem } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<(Invoice & { customer: any; repairJob: any; items: any[]; payments: any[] }) | null> => {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      repairJob: true,
      items: {
        include: { product: true },
      },
      payments: true,
      user: { select: { id: true, fullName: true } },
    },
  });
};

export const create = async (data: any): Promise<Invoice> => {
  const { items, ...invoiceData } = data;
  
  return prisma.invoice.create({
    data: {
      ...invoiceData,
      items: {
        create: items,
      },
    },
    include: { items: true },
  });
};

export const update = async (id: string, data: any): Promise<Invoice> => {
  const { items, ...invoiceData } = data;

  // For update, we might need a more complex logic to update/delete/create items
  // For now, let's just update the invoice metadata
  return prisma.invoice.update({
    where: { id },
    data: invoiceData,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.InvoiceWhereInput }): Promise<Invoice[]> => {
  return prisma.invoice.findMany({
    ...params,
    include: {
      customer: true,
      user: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.InvoiceWhereInput): Promise<number> => {
  return prisma.invoice.count({ where });
};

export const remove = async (id: string): Promise<Invoice> => {
  return prisma.invoice.delete({
    where: { id },
  });
};
