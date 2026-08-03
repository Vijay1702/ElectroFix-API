import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { validate } from '../middlewares/validate.middleware';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/history', customerController.getCustomerHistory);
router.post(
  '/',
  roleMiddleware([ROLES.ADMIN, ROLES.STAFF, ROLES.TECHNICIAN]),
  validate(createCustomerSchema),
  customerController.createCustomer
);
router.put(
  '/:id',
  roleMiddleware([ROLES.ADMIN, ROLES.STAFF, ROLES.TECHNICIAN]),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);
router.delete('/:id', roleMiddleware([ROLES.ADMIN]), customerController.deleteCustomer);

export default router;
