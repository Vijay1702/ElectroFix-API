import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get shop performance summary
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Performance metrics
 * /dashboard/recent-repairs:
 *   get:
 *     summary: Get recently added repairs
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of recent repairs
 */
router.get('/summary', dashboardController.getSummary);
router.get('/recent-repairs', dashboardController.getRecentRepairs);
router.get('/recent-sales', dashboardController.getRecentSales);
router.get('/low-stock', dashboardController.getLowStockItems);
router.get('/technician-workload', dashboardController.getTechnicianWorkload);

export default router;
