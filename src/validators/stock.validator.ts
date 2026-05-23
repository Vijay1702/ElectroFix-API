import { z } from 'zod';
import { STOCK_MOVEMENT_TYPE } from '../constants/stock-movement.constants';

export const createStockMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),
    movementType: z.nativeEnum(STOCK_MOVEMENT_TYPE),
    quantity: z.number().int(),
    referenceType: z.string().optional(),
    referenceId: z.string().uuid().optional(),
  }),
}).refine(data => {
  if (data.body.movementType === STOCK_MOVEMENT_TYPE.ADJUSTMENT) {
    return data.body.quantity !== 0;
  }
  return data.body.quantity >= 1;
}, {
  message: "Quantity must be at least 1 for IN/OUT, and non-zero for adjustments",
  path: ["body", "quantity"]
});

