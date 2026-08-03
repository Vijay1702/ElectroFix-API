import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
    password: passwordSchema,
    role: z.enum(['ADMIN', 'TECHNICIAN']),
    isActive: z.boolean().optional(),
    operationalStatus: z.enum(['Active', 'Inactive']).optional(),
    perDaySalary: z.number().nonnegative('Daily salary must be at least 0').optional(),
  }),
});


export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(10).optional(),
    password: passwordSchema.optional(),
    roleId: z.string().uuid().optional(),
    role: z.enum(['ADMIN', 'TECHNICIAN']).optional(),
    isActive: z.boolean().optional(),
    operationalStatus: z.enum(['Active', 'Inactive']).optional(),
    perDaySalary: z.number().nonnegative('Daily salary must be at least 0').optional(),
  }),
});
