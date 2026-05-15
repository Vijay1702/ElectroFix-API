import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { validate } from '../middlewares/validate.middleware';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List all invoices
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of invoices
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, items, subtotal, grandTotal]
 *             properties:
 *               customerId: { type: string }
 *               repairJobId: { type: string }
 *               subtotal: { type: number }
 *               discount: { type: number }
 *               tax: { type: number }
 *               grandTotal: { type: number }
 *               items: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemName: { type: string }
 *                     itemType: { type: string }
 *                     quantity: { type: integer }
 *                     unitPrice: { type: number }
 *                     totalPrice: { type: number }
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf', invoiceController.generateInvoicePDF);
router.post('/', roleMiddleware([ROLES.ADMIN, ROLES.STAFF, ROLES.TECHNICIAN]), validate(createInvoiceSchema), invoiceController.createInvoice);
router.put('/:id', roleMiddleware([ROLES.ADMIN, ROLES.STAFF, ROLES.TECHNICIAN]), validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete('/:id', roleMiddleware([ROLES.ADMIN]), invoiceController.deleteInvoice);

export default router;
