import { z } from 'zod';
import { PAYMENT_METHOD } from '../constants/payment-method.constants';

export const createPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID'),
    paymentMethod: z.nativeEnum(PAYMENT_METHOD),
    paymentAmount: z.number().min(0.01, 'Payment amount must be greater than 0'),
    paymentDate: z.string().datetime(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  }),
});
