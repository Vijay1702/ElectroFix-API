import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware([ROLES.ADMIN]));

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     summary: Generate sales report
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Sales report data
 * /reports/repairs:
 *   get:
 *     summary: Generate repairs report
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Repairs report data
 */
router.get('/sales', reportController.getSalesReport);
router.get('/repairs', reportController.getRepairsReport);
router.get('/products', reportController.getProductsReport);
router.get('/payments', reportController.getPaymentsReport);

export default router;
