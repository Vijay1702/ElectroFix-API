import { z } from 'zod';
import { ROLES } from '../constants/roles.constants';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(3, 'Full name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleId: z.string().uuid('Invalid role ID'),
    isActive: z.boolean().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(10).optional(),
    password: z.string().min(6).optional(),
    roleId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  }),
});
