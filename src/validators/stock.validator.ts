import { z } from 'zod';
import { STOCK_MOVEMENT_TYPE } from '../constants/stock-movement.constants';

export const createStockMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),
    movementType: z.nativeEnum(STOCK_MOVEMENT_TYPE),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    referenceType: z.string().optional(),
    referenceId: z.string().uuid().optional(),
  }),
});
