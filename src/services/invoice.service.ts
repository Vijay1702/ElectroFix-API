import * as invoiceRepository from '../repositories/invoice.repository';
import { MESSAGES } from '../constants/messages.constants';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';
import { generateInvoiceNumber } from '../utils/generate-code';
import PDFDocument = require('pdfkit');

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
  
  const { paidAmount = 0, grandTotal, invoiceDate, ...rest } = payload;
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
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
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

export const generateInvoiceBuffer = async (invoice: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- BRANDING & HEADER ---
      doc.fillColor('#1e40af').rect(0, 0, 595, 120).fill(); // Deep Blue Header
      
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('ELECTROFIX SOLUTIONS', 50, 40)
         .fontSize(10)
         .font('Helvetica')
         .text('PREMIUM HARDWARE SERVICES & SOLUTIONS', 50, 70);

      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('OFFICIAL INVOICE', 350, 45, { align: 'right' })
         .fontSize(12)
         .text(invoice.invoiceNumber || 'INV-000', 350, 70, { align: 'right' });

      // --- CUSTOMER & MERCHANT INFO ---
      doc.fillColor('#000000').fontSize(10);
      
      // Merchant (Left)
      doc.font('Helvetica-Bold').text('MERCHANT DETAILS', 50, 150);
      doc.font('Helvetica').text('ElectroFix HQ - Service Center', 50, 165);
      doc.text('GSTIN: 33AAAAA0000A1Z5', 50, 180);
      doc.text('Chennai, Tamil Nadu', 50, 195);

      // Customer (Right)
      doc.font('Helvetica-Bold').text('BILL TO', 350, 150);
      doc.font('Helvetica').text(invoice.customer?.fullName || 'Valued Customer', 350, 165);
      doc.text(invoice.customer?.phoneNumber || 'N/A', 350, 180);
      doc.text(invoice.customer?.email || '', 350, 195);

      // --- METADATA BAR ---
      doc.rect(50, 230, 500, 30).fill('#f1f5f9');
      doc.fillColor('#475569')
         .font('Helvetica-Bold').text('DATE:', 65, 241)
         .font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString(), 105, 241)
         .font('Helvetica-Bold').text('STATUS:', 300, 241)
         .font('Helvetica').text((invoice.paymentStatus || 'PAID').toUpperCase(), 355, 241);

      // --- TABLE HEADER ---
      let y = 280;
      doc.fillColor('#334155').rect(50, y, 500, 25).fill();
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('DESCRIPTION', 60, y + 8)
         .text('QTY', 300, y + 8)
         .text('RATE (INR)', 380, y + 8)
         .text('TOTAL (INR)', 480, y + 8);

      // --- TABLE ITEMS ---
      y += 35;
      doc.fillColor('#000000').font('Helvetica');
      const items = invoice.items || [];
      
      items.forEach((item: any, i: number) => {
        if (i % 2 === 0) doc.rect(50, y - 8, 500, 25).fill('#f8fafc');
        doc.fillColor('#000000')
           .text(item.itemName || 'Service/Product', 60, y)
           .text((item.quantity || 1).toString(), 300, y)
           .text(`${Number(item.unitPrice || 0).toLocaleString()}`, 380, y)
           .text(`${Number(item.totalPrice || 0).toLocaleString()}`, 480, y);
        y += 25;
      });

      // --- TOTALS ---
      y += 20;
      doc.font('Helvetica-Bold').text('SUBTOTAL (INR):', 350, y)
         .font('Helvetica').text(`${Number(invoice.subtotal || 0).toLocaleString()}`, 480, y);
      
      y += 20;
      doc.fillColor('#1e40af').rect(340, y - 10, 220, 35).fill();
      doc.fillColor('#ffffff')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('GRAND TOTAL:', 350, y + 5)
         .text(`INR ${Number(invoice.grandTotal || 0).toLocaleString()}`, 480, y + 5);

      // --- FOOTER ---
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('This is a computer-generated invoice. No physical signature is required.', 50, 780, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
