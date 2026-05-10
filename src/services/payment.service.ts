import * as paymentRepository from '../repositories/payment.repository';
import * as invoiceRepository from '../repositories/invoice.repository';
import { MESSAGES } from '../constants/messages.constants';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.config';

export const getPayments = async (pagination: any) => {
  const { skip, limit } = pagination;
  const payments = await paymentRepository.list({ skip, take: limit });
  const total = await paymentRepository.count();

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

    return payment;
  });
};
