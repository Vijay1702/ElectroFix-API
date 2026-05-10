import { Router } from 'express';
import * as stockController from '../controllers/stock.controller';
import { validate } from '../middlewares/validate.middleware';
import { createStockMovementSchema } from '../validators/stock.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /stock-movements:
 *   get:
 *     summary: List all stock movements
 *     tags: [Stock]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of movements
 *   post:
 *     summary: Record a stock movement
 *     tags: [Stock]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, movementType, quantity]
 *             properties:
 *               productId: { type: string }
 *               movementType: { type: string, enum: [IN, OUT] }
 *               quantity: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Movement recorded
 */
router.get('/', stockController.getStockMovements);
router.post('/', roleMiddleware([ROLES.ADMIN, ROLES.STAFF]), validate(createStockMovementSchema), stockController.createStockMovement);

export default router;
