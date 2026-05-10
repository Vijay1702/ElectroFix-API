import prisma from '../config/prisma.config';

export const getSalesReport = async (startDate?: string, endDate?: string) => {
  const where: any = {};
  if (startDate && endDate) {
    where.invoiceDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: { select: { fullName: true } } },
    orderBy: { invoiceDate: 'asc' },
  });

  const stats = await prisma.invoice.aggregate({
    where,
    _sum: {
      grandTotal: true,
      paidAmount: true,
      pendingAmount: true,
    },
    _count: { id: true },
  });

  return { invoices, stats };
};

export const getRepairsReport = async (startDate?: string, endDate?: string) => {
  const where: any = {};
  if (startDate && endDate) {
    where.receivedDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const repairs = await prisma.repairJob.findMany({
    where,
    include: {
      customer: { select: { fullName: true } },
      technician: { select: { fullName: true } },
    },
    orderBy: { receivedDate: 'asc' },
  });

  const statusStats = await prisma.repairJob.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });

  return { repairs, statusStats };
};

export const getProductsReport = async () => {
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { stockQuantity: 'desc' },
  });

  const totalValue = await prisma.product.aggregate({
    _sum: {
      stockQuantity: true,
      // We can't sum expressions in Prisma directly, so we'll do it manually or via queryRaw if needed
    },
  });

  return { products, totalStock: totalValue._sum.stockQuantity };
};

export const getPaymentsReport = async (startDate?: string, endDate?: string) => {
  const where: any = {};
  if (startDate && endDate) {
    where.paymentDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: { select: { invoiceNumber: true } },
      user: { select: { fullName: true } },
    },
    orderBy: { paymentDate: 'asc' },
  });

  const methodStats = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where,
    _sum: { paymentAmount: true },
    _count: { id: true },
  });

  return { payments, methodStats };
};
