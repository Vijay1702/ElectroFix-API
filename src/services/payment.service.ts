import * as paymentRepository from '../repositories/payment.repository';
import * as invoiceRepository from '../repositories/invoice.repository';
import { MESSAGES } from '../constants/messages.constants';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';
import { REPAIR_STATUS } from '../constants/repair-status.constants';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.config';

export const getPayments = async (pagination: any, filters?: { search?: string; startDate?: string; endDate?: string }) => {
  const { skip, limit, all } = pagination;
  const where: any = {};
  
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
       const end = new Date(filters.endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  const payments = await paymentRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
  const total = await paymentRepository.count(where);

  return { payments, total };
};

export const getPaymentById = async (id: string) => {
  const payment = await paymentRepository.findById(id);

  if (!payment) {
    throw { statusCode: 404, message: MESSAGES.PAYMENT.NOT_FOUND };
  }

  return payment;
};

export const createPayment = async (payload: any, userId: string) => {
  const { invoiceId, paymentAmount, ...rest } = payload;

  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) {
    throw { statusCode: 404, message: MESSAGES.INVOICE.NOT_FOUND };
  }

  const newPaidAmount = Number(invoice.paidAmount) + Number(paymentAmount);
  const newPendingAmount = Number(invoice.grandTotal) - newPaidAmount;

  let newStatus: string = PAYMENT_STATUS.PARTIAL;
  if (newPendingAmount <= 0) {
    newStatus = PAYMENT_STATUS.PAID;
  } else if (newPaidAmount === 0) {
    newStatus = PAYMENT_STATUS.PENDING;
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create payment
    const payment = await tx.payment.create({
      data: {
        ...rest,
        invoiceId,
        paymentAmount,
        createdBy: userId,
      },
    });

    // Update invoice
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        paymentStatus: newStatus,
      },
    });

    if (newStatus === PAYMENT_STATUS.PAID && invoice.repairJobId) {
      const linkedJob = await tx.repairJob.findUnique({ where: { id: invoice.repairJobId } });

      if (
        linkedJob &&
        linkedJob.status !== REPAIR_STATUS.DELIVERED &&
        linkedJob.status !== REPAIR_STATUS.BILL_PAYMENTED
      ) {
        await tx.repairJob.update({
          where: { id: invoice.repairJobId },
          data: { status: REPAIR_STATUS.BILL_PAYMENTED },
        });

        await tx.repairStatusHistory.create({
          data: {
            repairJob: { connect: { id: invoice.repairJobId } },
            oldStatus: linkedJob.status,
            newStatus: REPAIR_STATUS.BILL_PAYMENTED,
            user: { connect: { id: userId } },
            notes: 'Status updated to Bill Paymented automatically as invoice payment completed in full.',
          },
        });
      }
    }

    return payment;
  });
};
