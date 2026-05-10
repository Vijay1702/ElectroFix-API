import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).optional(),
    phoneNumber: z.string().min(10).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
});
