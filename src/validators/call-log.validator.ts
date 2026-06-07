import { z } from 'zod';

export const createCallLogSchema = z.object({
  body: z.object({
    outcome: z.string().min(1, 'Call outcome is required'),
    notes: z.string().optional(),
  }),
});
