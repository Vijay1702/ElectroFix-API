import { z } from 'zod';
import { PAYMENT_STATUS } from '../constants/payment-status.constants';

const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  itemName: z.string().min(1, 'Item name is required'),
  itemType: z.string().min(1, 'Item type is required'),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    repairJobId: z.string().uuid().optional().nullable(),
    subtotal: z.number().min(0),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    grandTotal: z.number().min(0),
    paidAmount: z.number().min(0).optional(),
    invoiceDate: z.string().datetime().optional().nullable(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    repairJobId: z.string().uuid().optional().nullable(),
    subtotal: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    grandTotal: z.number().min(0).optional(),
    paidAmount: z.number().min(0).optional(),
    paymentStatus: z.nativeEnum(PAYMENT_STATUS).optional(),
    invoiceDate: z.string().datetime().optional(),
  }),
});
