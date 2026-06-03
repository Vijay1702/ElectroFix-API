import * as invoiceRepository from '../repositories/invoice.repository';
import { MESSAGES } from '../constants/messages.constants';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';
import { generateInvoiceNumber } from '../utils/generate-code';
import PDFDocument = require('pdfkit');
import prisma from '../config/prisma.config';

export const getInvoices = async (pagination: any, filters: { search?: string, status?: string }) => {
  const { skip, limit, all } = pagination;
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
    ];
  }

  const invoices = await invoiceRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
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

  const invoice: any = await invoiceRepository.create({
    ...rest,
    invoiceNumber,
    paidAmount,
    grandTotal,
    pendingAmount,
    paymentStatus,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    createdBy: userId,
  });

  if (paymentStatus === PAYMENT_STATUS.PAID && payload.repairJobId) {
    await prisma.repairJob.update({
      where: { id: payload.repairJobId },
      data: { status: 'delivered' },
    });
    
    await prisma.repairStatusHistory.create({
      data: {
        repairJob: { connect: { id: payload.repairJobId } },
        oldStatus: 'pending_to_deliver',
        newStatus: 'delivered',
        user: { connect: { id: userId } },
        notes: 'Status updated to delivered automatically as invoice payment completed in full.',
      },
    });
  }

  // Reduce product stock and create stock movements for each product item
  if (invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      if (item.itemType === 'PRODUCT' && item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        if (product) {
          const previousStock = product.stockQuantity;
          const currentStock = Math.max(0, previousStock - item.quantity);
          
          // Update product stock
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: currentStock }
          });
          
          // Log stock movement
          await prisma.stockMovement.create({
            data: {
              product: { connect: { id: item.productId } },
              movementType: 'OUT',
              quantity: item.quantity,
              previousStock,
              currentStock,
              referenceType: 'INVOICE',
              referenceId: invoice.id,
              user: { connect: { id: userId } }
            }
          });
        }
      }
    }
  }

  return invoice;
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

  const updatedInvoice = await invoiceRepository.update(id, payload);

  if (updatedInvoice.paymentStatus === PAYMENT_STATUS.PAID && updatedInvoice.repairJobId) {
    await prisma.repairJob.update({
      where: { id: updatedInvoice.repairJobId },
      data: { status: 'delivered' },
    });

    const existingHistory = await prisma.repairStatusHistory.findFirst({
      where: {
        repairJobId: updatedInvoice.repairJobId,
        newStatus: 'delivered',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingHistory) {
      await prisma.repairStatusHistory.create({
        data: {
          repairJob: { connect: { id: updatedInvoice.repairJobId } },
          oldStatus: 'pending_to_deliver',
          newStatus: 'delivered',
          user: { connect: { id: updatedInvoice.createdBy } },
          notes: 'Status updated to delivered automatically as invoice payment completed in full.',
        },
      });
    }
  }

  return updatedInvoice;
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
      const path = require('path');
      const fs = require('fs');
      
      const items = invoice.items || [];
      // Estimate item heights dynamically based on character wrapping (approx 28 chars per line)
      let itemHeight = 0;
      items.forEach((item: any) => {
        const lines = Math.ceil((item.itemName || '').length / 28) || 1;
        itemHeight += (lines * 8) + 14;
      });
      
      // Base height for headers, metadata, summary box, and margins
      const totalHeight = 140 + 8 + 35 + 15 + itemHeight + 8 + 70 + 40 + 20;
      
      const doc = new PDFDocument({ 
        size: [164, totalHeight], 
        margins: { top: 8, bottom: 8, left: 8, right: 8 } 
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- BRANDING & HEADER (58mm style) ---
      let y = 8;
      
      // Load and render corporate logo (smaller for 58mm)
      const logoPath = path.join(process.cwd(), 'src/assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (164 - 30) / 2, y, { width: 30, height: 30 });
        y += 33;
      }
      
      doc
        .fillColor("#000000")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("SRI SENTHIL SPARES AND SERVICES", 8, y, {
          align: "center",
        })
        .text("Thalayari street, Pattukkottai - 614601", 8, y + 22, {
          align: "center",
        });
         
      y += 32;

      // Divider
      doc.font('Helvetica-Bold').fontSize(6).text('------------------------------------------', 8, y);
      y += 8;

      // Invoice Details
      doc.font('Helvetica-Bold')
         .fontSize(6)
         .text('INVOICE:', 8, y)
         .font('Helvetica')
         .text(invoice.invoiceNumber || 'INV-000', 45, y)
         .font('Helvetica-Bold')
         .text('DATE:', 8, y + 8)
         .font('Helvetica')
         .text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), 45, y + 8)
         .font('Helvetica-Bold')
         .text('CUST:', 8, y + 16)
         .font('Helvetica')
         .text(invoice.customer?.fullName || 'Valued Customer', 45, y + 16, { width: 111, height: 8 })
         .font('Helvetica-Bold')
         .text('PHONE:', 8, y + 24)
         .font('Helvetica')
         .text(invoice.customer?.phoneNumber || 'N/A', 45, y + 24);

      y += 33;

      // Table Header
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(6)
         .text('ITEM', 8, y)
         .text('QTY', 92, y, { width: 15, align: 'right' })
         .text('PRICE (INR)', 112, y, { width: 44, align: 'right' });

      y += 9;
      doc.font('Helvetica').text('------------------------------------------', 8, y);
      y += 8;

      // Table Items
      items.forEach((item: any) => {
        const name = item.itemName || 'Item';
        const qty = item.quantity || 1;
        const price = Number(item.unitPrice || 0);
        const total = Number(item.totalPrice || 0);
        
        doc.font('Helvetica-Bold')
           .fontSize(6)
           .text(name, 8, y, { width: 148 });
        
        // Dynamically shift Y by text height
        y += doc.heightOfString(name, { width: 148 }) + 2;
        
        doc.font('Helvetica')
           .fontSize(6)
           .text(`  ${qty} x ${price.toFixed(1)}`, 8, y)
           .text(total.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), 112, y, { width: 44, align: 'right' });
           
        y += 10;
      });

      // Divider
      doc.font('Helvetica-Bold').text('------------------------------------------', 8, y);
      y += 8;

      // Summary
      doc.fontSize(6)
         .font('Helvetica-Bold')
         .text('SUBTOTAL:', 45, y, { width: 45, align: 'right' })
         .font('Helvetica')
         .text(Number(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 100, y, { width: 56, align: 'right' })
         
         .font('Helvetica-Bold')
         .text('PAID:', 45, y + 8, { width: 45, align: 'right' })
         .font('Helvetica')
         .text(Number(invoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 100, y + 8, { width: 56, align: 'right' })
         
         .font('Helvetica-Bold')
         .text('BALANCE:', 45, y + 16, { width: 45, align: 'right' })
         .font('Helvetica')
         .text(Number(invoice.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 100, y + 16, { width: 56, align: 'right' });

      y += 26;

      // Grand Total Highlight box
      doc.rect(8, y, 148, 18).fill('#f1f5f9');
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(7)
         .text('TO BE PAID: INR ' + Number(invoice.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 12, y + 5, { align: 'center', width: 140 });

      y += 24;

      // Footer
      doc.font('Helvetica')
         .fontSize(5)
         .fillColor('#64748b')
         .text('Thank you! Visit again.', 8, y, { align: 'center', width: 148 })
         .text('Powered by ElectroFix', 8, y + 7, { align: 'center', width: 148 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
