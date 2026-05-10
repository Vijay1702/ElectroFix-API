import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middlewares/validate.middleware';
import { createPaymentSchema } from '../validators/payment.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List all payments
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of payments
 *   post:
 *     summary: Record a payment
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId, paymentAmount, paymentMethod, paymentDate]
 *             properties:
 *               invoiceId: { type: string }
 *               paymentAmount: { type: number }
 *               paymentMethod: { type: string, enum: [CASH, CARD, UPI, BANK_TRANSFER] }
 *               paymentDate: { type: string, format: date-time }
 *               referenceNumber: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Payment recorded
 */
router.get('/', paymentController.getPayments);
router.get('/:id', paymentController.getPaymentById);
router.post('/', roleMiddleware([ROLES.ADMIN, ROLES.STAFF]), validate(createPaymentSchema), paymentController.createPayment);

export default router;
