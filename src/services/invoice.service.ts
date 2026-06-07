import * as invoiceRepository from "../repositories/invoice.repository";
import { MESSAGES } from "../constants/messages.constants";
import { PAYMENT_STATUS } from "../constants/payment-status.constants";
import { generateInvoiceNumber } from "../utils/generate-code";
import PDFDocument = require("pdfkit");
import prisma from "../config/prisma.config";

export const getInvoices = async (
  pagination: any,
  filters: { search?: string; status?: string },
) => {
  const { skip, limit, all } = pagination;
  const { search, status } = filters;

  const where: any = {};

  if (status) {
    where.paymentStatus = status;
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { customer: { fullName: { contains: search, mode: "insensitive" } } },
      { customer: { phoneNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const invoices = await invoiceRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where,
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
      data: { status: "delivered" },
    });

    await prisma.repairStatusHistory.create({
      data: {
        repairJob: { connect: { id: payload.repairJobId } },
        oldStatus: "pending_to_deliver",
        newStatus: "delivered",
        user: { connect: { id: userId } },
        notes:
          "Status updated to delivered automatically as invoice payment completed in full.",
      },
    });
  }

  // Reduce product stock and create stock movements for each product item
  if (invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      if (item.itemType === "PRODUCT" && item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const previousStock = product.stockQuantity;
          const currentStock = Math.max(0, previousStock - item.quantity);

          // Update product stock
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: currentStock },
          });

          // Log stock movement
          await prisma.stockMovement.create({
            data: {
              product: { connect: { id: item.productId } },
              movementType: "OUT",
              quantity: item.quantity,
              previousStock,
              currentStock,
              referenceType: "INVOICE",
              referenceId: invoice.id,
              user: { connect: { id: userId } },
            },
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

  if (
    updatedInvoice.paymentStatus === PAYMENT_STATUS.PAID &&
    updatedInvoice.repairJobId
  ) {
    await prisma.repairJob.update({
      where: { id: updatedInvoice.repairJobId },
      data: { status: "delivered" },
    });

    const existingHistory = await prisma.repairStatusHistory.findFirst({
      where: {
        repairJobId: updatedInvoice.repairJobId,
        newStatus: "delivered",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existingHistory) {
      await prisma.repairStatusHistory.create({
        data: {
          repairJob: { connect: { id: updatedInvoice.repairJobId } },
          oldStatus: "pending_to_deliver",
          newStatus: "delivered",
          user: { connect: { id: updatedInvoice.createdBy } },
          notes:
            "Status updated to delivered automatically as invoice payment completed in full.",
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
  let shopPhone = "9443631389";
  let shopEmail = "rameshvijay871@gmail.com";
  try {
    const settings = await prisma.setting.findMany();
    const phoneSetting = settings.find((s: any) => s.settingKey === "shop_phone");
    if (phoneSetting && phoneSetting.settingValue) {
      shopPhone = phoneSetting.settingValue;
    }
    const emailSetting = settings.find((s: any) => s.settingKey === "shop_email");
    if (emailSetting && emailSetting.settingValue) {
      shopEmail = emailSetting.settingValue;
    }
  } catch (err) {
    console.error("Failed to fetch shop settings:", err);
  }

  // Use values from settings if they are customized, otherwise default to mockup details
  const displayPhone = (shopPhone && shopPhone !== "9443631389") ? shopPhone : "9443631389";
  const displayEmail = (shopEmail && shopEmail !== "rameshvijay871@gmail.com") ? shopEmail : "rameshvijay871@gmail.com";
  const displayWebsite = "https://srisenthilelectrofixin.vercel.app/";

  return new Promise((resolve, reject) => {
    try {
      const path = require("path");
      const fs = require("fs");

      const items = invoice.items || [];
      // Estimate item heights dynamically based on character wrapping (approx 24 chars per line for width 124)
      let itemHeight = 0;
      items.forEach((item: any) => {
        const lines = Math.ceil((item.itemName || "").length / 24) || 1;
        itemHeight += lines * 8 + 8 + 12; // name lines + qty/amount line + divider/padding
      });

      // Base height for header, dividers, metadata block, totals, footer, and margins
      const baseHeight = 280;
      const totalHeight = baseHeight + itemHeight;

      const doc = new PDFDocument({
        size: [136, totalHeight], // 48mm width exactly
        margins: { top: 6, bottom: 6, left: 6, right: 6 },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      let y = 6;

      // Centered corporate logo
      const logoPath = path.join(process.cwd(), "src/assets/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (136 - 20) / 2, y, { width: 20, height: 20 });
        y += 24;
      }

      // Business Branding
      doc
        .fillColor("#000000")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SRI SENTHIL", 6, y, { align: "center", width: 124 });
      y += 10;

      doc
        .fontSize(6.5)
        .font("Helvetica-Bold")
        .text("SPARES & SERVICES", 6, y, { align: "center", width: 124 });
      y += 8;

      // Double line divider
      doc
        .moveTo(6, y)
        .lineTo(130, y)
        .lineWidth(0.8)
        .strokeColor("#000000")
        .stroke();
      doc
        .moveTo(6, y + 2)
        .lineTo(130, y + 2)
        .lineWidth(0.8)
        .strokeColor("#000000")
        .stroke();
      y += 6;

      // RECEIPT Title
      doc
        .fillColor("#000000")
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("RECEIPT", 6, y, { align: "center", width: 124 });
      y += 10;

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

      // Split metadata block - dynamic layout to prevent overlaps
      const metaY = y;
      doc.font("Helvetica").fontSize(6).fillColor("#1e293b");

      // Left column
      let leftY = metaY;
      doc.text(`DATE: ${dateStr}`, 6, leftY, { width: 58 });
      leftY += doc.heightOfString(`DATE: ${dateStr}`, { width: 58 }) + 2;
      doc.text(`TIME: ${timeStr}`, 6, leftY, { width: 58 });
      leftY += doc.heightOfString(`TIME: ${timeStr}`, { width: 58 }) + 2;

      // Right column
      let rightY = metaY;
      doc.text(`INVOICE: #${invoice.invoiceNumber || "INV-000"}`, 72, rightY, { width: 58 });
      rightY += doc.heightOfString(`INVOICE: #${invoice.invoiceNumber || "INV-000"}`, { width: 58 }) + 2;

      const customerStr = `CUSTOMER: ${customerName}`;
      doc.text(customerStr, 72, rightY, { width: 58 });
      rightY += doc.heightOfString(customerStr, { width: 58 }) + 2;

      if (invoice.customer?.phoneNumber) {
        doc.text(`PHONE: ${invoice.customer.phoneNumber}`, 72, rightY, { width: 58 });
        rightY += doc.heightOfString(`PHONE: ${invoice.customer.phoneNumber}`, { width: 58 }) + 2;
      }

      const maxHeight = Math.max(leftY, rightY);

      // Vertical line divider at X = 68
      doc
        .moveTo(68, metaY - 2)
        .lineTo(68, maxHeight - 2)
        .lineWidth(0.5)
        .strokeColor("#94a3b8")
        .stroke();

      y = maxHeight + 4;

      // Divider
      doc
        .moveTo(6, y)
        .lineTo(130, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 6;

      // Table Items (Single column format)
      items.forEach((item: any, i: number) => {
        const name = item.itemName || "Item";
        const qty = item.quantity || 1;
        const total = Number(item.totalPrice || 0);

        doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a").text(name, 6, y, { width: 124 });
        y += doc.heightOfString(name, { width: 124 }) + 2;

        doc.font("Helvetica").fontSize(6).fillColor("#475569")
          .text(`QTY: ${qty}, AMOUNT: ${total.toFixed(1)}`, 6, y);
        y += 9;

        // Draw solid separator line between items (except the last one)
        if (i < items.length - 1) {
          doc
            .moveTo(6, y)
            .lineTo(130, y)
            .lineWidth(0.3)
            .strokeColor("#cbd5e1")
            .stroke();
          y += 5;
        }
      });

      y += 2;
      // Solid divider line below items
      doc
        .moveTo(6, y)
        .lineTo(130, y)
        .lineWidth(0.5)
        .strokeColor("#000000")
        .stroke();
      y += 5;

      // Summary
      doc.font("Helvetica").fontSize(6.5).fillColor("#0f172a");

      // Grand Total
      doc.font("Helvetica-Bold").fontSize(7.5)
        .text("GRAND TOTAL", 6, y)
        .text("Rs. " + Number(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 70, y, { width: 60, align: "right" });
      y += 10;

      // Paid
      doc.font("Helvetica-Bold").fontSize(7.5)
        .text("PAID:", 6, y)
        .text("Rs. " + Number(invoice.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 70, y, { width: 60, align: "right" });
      y += 10;

      // Balance
      const balance = Number(invoice.pendingAmount || 0);
      if (balance > 0) {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#991b1b")
          .text("BALANCE:", 6, y)
          .text("Rs. " + balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 70, y, { width: 60, align: "right" });
        y += 10;
      }
      y += 4;

      // Gear pattern separator
      const drawGearPattern = (yPos: number) => {
        for (let x = 10; x <= 126; x += 8) {
          doc.circle(x, yPos, 1.4).fillColor("#cbd5e1").fill();
          for (let a = 0; a < 360; a += 60) {
            const rad = (a * Math.PI) / 180;
            const tx = x + Math.cos(rad) * 1.8;
            const ty = yPos + Math.sin(rad) * 1.8;
            doc.circle(tx, ty, 0.4).fillColor("#cbd5e1").fill();
          }
          doc.circle(x, yPos, 0.5).fillColor("#ffffff").fill();
        }
      };

      drawGearPattern(y);
      y += 8;

      // Contact block with vector icons
      doc.fontSize(5.5).font("Helvetica").fillColor("#334155");

      // 1. Phone row: retro telephone icon
      doc.save();
      doc.translate(6, y - 1);
      doc.scale(0.85);
      doc.moveTo(1, 2).bezierCurveTo(3, 0, 5, 0, 7, 2).lineTo(6.5, 3.5).bezierCurveTo(5, 2.5, 3, 2.5, 1.5, 3.5).closePath().fillColor("#0f172a").fill();
      doc.moveTo(2, 4).lineTo(6, 4).lineTo(7.5, 7).lineTo(0.5, 7).closePath().fillColor("#0f172a").fill();
      doc.restore();

      doc.text(`P: ${displayPhone}`, 15, y);
      y += 7;

      // 2. Email row: @ icon
      doc.font("Helvetica-Bold").fontSize(6.5).text("@", 6, y - 0.5);
      doc.font("Helvetica").fontSize(5.5).text(displayEmail, 15, y);
      y += 7;

      // 3. Globe row: vector globe icon
      doc.save();
      doc.translate(6, y);
      doc.scale(0.85);
      doc.circle(3, 3, 3.2).strokeColor("#0f172a").lineWidth(0.5).stroke();
      doc.moveTo(-0.2, 3).lineTo(6.2, 3).stroke();
      doc.moveTo(3, -0.2).lineTo(3, 6.2).stroke();
      doc.ellipse(3, 3, 1.5, 3.2).stroke();
      doc.restore();

      doc.text(displayWebsite, 15, y);
      y += 10;

      // Gear pattern separator below contacts
      drawGearPattern(y);
      y += 8;

      // Footer Section
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("THANK YOU!", 6, y, { align: "center", width: 124 });
      y += 10;

      doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("#475569").text("Visit Us Again!", 6, y, { align: "center", width: 124 });
      y += 9;

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
