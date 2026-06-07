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
      const path = require("path");
      const fs = require("fs");

      const items = invoice.items || [];
      // Estimate item heights dynamically based on character wrapping (approx 20 chars per line for width 74)
      let itemHeight = 0;
      items.forEach((item: any) => {
        const lines = Math.ceil((item.itemName || "").length / 20) || 1;
        itemHeight += lines * 8 + 12;
      });

      // Base height for header, dividers, metadata block, totals, footer, and margins
      const baseHeight = 280;
      const totalHeight = baseHeight + itemHeight;

      const doc = new PDFDocument({
        size: [164, totalHeight],
        margins: { top: 8, bottom: 8, left: 8, right: 8 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      let y = 8;

      // Centered corporate logo
      const logoPath = path.join(process.cwd(), "src/assets/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (164 - 24) / 2, y, { width: 24, height: 24 });
        y += 28;
      }

      // Business Branding
      doc
        .fillColor("#000000")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SRI SENTHIL", 8, y, { align: "center", width: 148 });
      y += 11;

      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text("SPARES & SERVICES", 8, y, { align: "center", width: 148 });
      y += 9;

      doc
        .fontSize(6)
        .font("Helvetica")
        .fillColor("#334155")
        .text("Thalayari street, Pattukkottai - 614601", 8, y, { align: "center", width: 148 });
      y += 12;

      // Divider
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 5;

      // RECEIPT Title
      doc
        .fillColor("#000000")
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("RECEIPT", 8, y, { align: "center", width: 148 });
      y += 11;

      // Date & Time formatting
      const invDate = new Date(invoice.invoiceDate || new Date());
      const dateStr = invDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).toUpperCase();
      const timeStr = invDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const customerName = (invoice.customer?.fullName || "Guest").toUpperCase();
      const customerPhone = invoice.customer?.phoneNumber || "";

      // Metadata block (Date, Time, Invoice No., Customer details)
      doc.font("Helvetica").fontSize(6.5).fillColor("#1e293b");
      
      doc.text(`DATE: ${dateStr} | TIME: ${timeStr}`, 8, y, { align: "center", width: 148 });
      y += 8;
      
      doc.text(`TICKET: #${invoice.invoiceNumber || "INV-000"}`, 8, y, { align: "center", width: 148 });
      y += 8;

      doc.text(`CUSTOMER: ${customerName}`, 8, y, { align: "center", width: 148 });
      y += 8;

      if (customerPhone) {
        doc.text(`PHONE: ${customerPhone}`, 8, y, { align: "center", width: 148 });
        y += 8;
      }
      y += 3;

      // Divider
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 4;

      // Table Header
      doc.font("Helvetica-Bold").fontSize(6).fillColor("#000000");
      doc.text("ITEM", 8, y);
      doc.text("QTY", 82, y, { width: 18, align: "center" });
      doc.text("PRICE", 100, y, { width: 26, align: "right" });
      doc.text("TOTAL", 126, y, { width: 30, align: "right" });
      y += 8;

      // Divider below headers
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 5;

      // Table Items
      items.forEach((item: any) => {
        const name = item.itemName || "Item";
        const qty = item.quantity || 1;
        const price = Number(item.unitPrice || 0);
        const total = Number(item.totalPrice || 0);

        const startY = y;
        doc.font("Helvetica-Bold").fontSize(6).fillColor("#000000").text(name, 8, startY, { width: 74 });
        const textHeight = doc.heightOfString(name, { width: 74 });

        doc.font("Helvetica")
          .fontSize(6)
          .fillColor("#000000")
          .text(qty.toString(), 82, startY, { width: 18, align: "center" })
          .text(price.toFixed(1), 100, startY, { width: 26, align: "right" })
          .text(total.toFixed(1), 126, startY, { width: 30, align: "right" });

        y = startY + Math.max(textHeight, 8) + 5;
      });

      // Divider below items
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 5;

      // Summary
      doc.font("Helvetica").fontSize(6).fillColor("#1e293b");

      // Subtotal
      doc.text("Subtotal:", 8, y)
         .text(Number(invoice.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
      y += 8;

      // Taxes
      if (Number(invoice.tax || 0) > 0) {
        doc.text("Taxes:", 8, y)
           .text(Number(invoice.tax).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
        y += 8;
      }

      // Discount
      if (Number(invoice.discount || 0) > 0) {
        doc.text("Discount:", 8, y)
           .text("-" + Number(invoice.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
        y += 8;
      }

      // Divider before Grand Total
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 4;

      // Grand Total Row
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
         .text("GRAND TOTAL", 8, y)
         .text("Rs. " + Number(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
      y += 10;

      // Divider after Grand Total
      doc
        .moveTo(8, y)
        .lineTo(156, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 5;

      // Parse Payment Method from notes
      let paymentMethod = "CASH";
      if (invoice.notes) {
        if (invoice.notes.includes("Payment Method: QR")) {
          paymentMethod = "QR";
        } else if (invoice.notes.includes("Payment Method: CASH")) {
          paymentMethod = "CASH";
        }
      }

      // Paid Amount
      const paymentSuffix = paymentMethod ? ` (${paymentMethod})` : "";
      doc.font("Helvetica").fontSize(6).fillColor("#1e293b")
         .text(`PAID${paymentSuffix}:`, 8, y)
         .text(Number(invoice.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
      y += 8;

      // Balance Due or Change
      const grandTotal = Number(invoice.grandTotal || 0);
      const paid = Number(invoice.paidAmount || 0);
      const balance = Number(invoice.pendingAmount || 0);
      const change = Math.max(0, paid - grandTotal);

      if (balance > 0) {
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#991b1b")
           .text("BALANCE DUE:", 8, y)
           .text(balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
        y += 10;
      } else if (change > 0) {
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#15803d")
           .text("CHANGE:", 8, y)
           .text(change.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 100, y, { width: 56, align: "right" });
        y += 10;
      }
      y += 5;

      // Footer Section
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000").text("THANK YOU!", 8, y, { align: "center", width: 148 });
      y += 10;

      doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("#475569").text("Visit Us Again!", 8, y, { align: "center", width: 148 });
      y += 10;

      doc.font("Helvetica").fontSize(5.5).fillColor("#94a3b8").text("Powered by ElectroFix", 8, y, { align: "center", width: 148 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
