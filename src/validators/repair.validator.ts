import { z } from 'zod';
import { REPAIR_STATUS } from '../constants/repair-status.constants';

export const createRepairJobSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
    technicianId: z.string().uuid('Invalid technician ID'),
    deviceType: z.string().min(1, 'Device type is required'),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    problemDescription: z.string().min(1, 'Problem description is required'),
    deviceCondition: z.string().optional(),
    estimatedCost: z.number().optional(),
    advanceAmount: z.number().optional(),
    receivedDate: z.string().datetime(),
    expectedDeliveryDate: z.string().datetime().optional(),
  }),
});

export const updateRepairJobSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    technicianId: z.string().uuid().optional(),
    deviceType: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    problemDescription: z.string().optional(),
    deviceCondition: z.string().optional(),
    estimatedCost: z.number().optional(),
    advanceAmount: z.number().optional(),
    status: z.nativeEnum(REPAIR_STATUS).optional(),
    expectedDeliveryDate: z.string().datetime().optional(),
    deliveredDate: z.string().datetime().optional(),
  }),
});

export const updateRepairStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(REPAIR_STATUS),
    notes: z.string().optional(),
  }),
});
