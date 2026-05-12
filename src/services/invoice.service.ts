import * as invoiceRepository from '../repositories/invoice.repository';
import { MESSAGES } from '../constants/messages.constants';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';
import { generateInvoiceNumber } from '../utils/generate-code';

export const getInvoices = async (pagination: any, filters: { search?: string, status?: string }) => {
  const { skip, limit } = pagination;
  const { search, status } = filters;

  const where: any = {};

  if (status) {
    where.paymentStatus = status;
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const invoices = await invoiceRepository.list({ skip, take: limit, where });
  const total = await invoiceRepository.count(where);

  return { invoices, total };
};

export const getInvoiceById = async (id: string) => {
  const invoice = await invoiceRepository.findById(id);

  if (!invoice) {
    throw { statusCode: 404, message: MESSAGES.INVOICE.NOT_FOUND };
  }

  return invoice;
};

export const createInvoice = async (payload: any, userId: string) => {
  const invoiceNumber = await generateInvoiceNumber();
  
  const { paidAmount = 0, grandTotal, ...rest } = payload;
  const pendingAmount = grandTotal - paidAmount;
  
  let paymentStatus: string = PAYMENT_STATUS.PENDING;
  if (pendingAmount <= 0) {
    paymentStatus = PAYMENT_STATUS.PAID;
  } else if (paidAmount > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIAL;
  }

  return invoiceRepository.create({
    ...rest,
    invoiceNumber,
    paidAmount,
    grandTotal,
    pendingAmount,
    paymentStatus,
    createdBy: userId,
  });
};

export const updateInvoice = async (id: string, payload: any) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw { statusCode: 404, message: MESSAGES.INVOICE.NOT_FOUND };
  }

  if (payload.grandTotal !== undefined || payload.paidAmount !== undefined) {
    const grandTotal = payload.grandTotal ?? invoice.grandTotal;
    const paidAmount = payload.paidAmount ?? invoice.paidAmount;
    payload.pendingAmount = Number(grandTotal) - Number(paidAmount);

    if (payload.pendingAmount <= 0) {
      payload.paymentStatus = PAYMENT_STATUS.PAID;
    } else if (Number(paidAmount) > 0) {
      payload.paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else {
      payload.paymentStatus = PAYMENT_STATUS.PENDING;
    }
  }

  return invoiceRepository.update(id, payload);
};

export const deleteInvoice = async (id: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw { statusCode: 404, message: MESSAGES.INVOICE.NOT_FOUND };
  }

  return invoiceRepository.remove(id);
};

export const generateInvoicePDF = async (id: string) => {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw { statusCode: 404, message: MESSAGES.INVOICE.NOT_FOUND };
  }
  
  // In a real app, you would use a library like pdfkit or puppeteer to generate a PDF.
  // For now, we just return the invoice data which can be used by the frontend to render/print.
  return invoice;
};
