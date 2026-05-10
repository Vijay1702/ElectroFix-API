import prisma from "../config/prisma.config";

/**
 * Generate unique customer code: CUST-0001, CUST-0002...
 */
export const generateCustomerCode = async (): Promise<string> => {
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { createdAt: "desc" },
    select: { customerCode: true },
  });

  let nextNumber = 1;
  if (lastCustomer?.customerCode) {
    const lastNumber = parseInt(lastCustomer.customerCode.replace("CUST-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `CUST-${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Generate unique job number: JOB-0001, JOB-0002...
 */
export const generateJobNumber = async (): Promise<string> => {
  const lastJob = await prisma.repairJob.findFirst({
    orderBy: { createdAt: "desc" },
    select: { jobNumber: true },
  });

  let nextNumber = 1;
  if (lastJob?.jobNumber) {
    const lastNumber = parseInt(lastJob.jobNumber.replace("JOB-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `JOB-${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Generate unique invoice number: INV-0001, INV-0002...
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;
  if (lastInvoice?.invoiceNumber) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace("INV-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `INV-${String(nextNumber).padStart(4, "0")}`;
};

/**
 * Generate unique product code: PROD-0001, PROD-0002...
 */
export const generateProductCode = async (): Promise<string> => {
  const lastProduct = await prisma.product.findFirst({
    orderBy: { createdAt: "desc" },
    select: { productCode: true },
  });

  let nextNumber = 1;
  if (lastProduct?.productCode) {
    const lastNumber = parseInt(lastProduct.productCode.replace("PROD-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `PROD-${String(nextNumber).padStart(4, "0")}`;
};
