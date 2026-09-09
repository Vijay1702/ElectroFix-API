import { Router } from 'express';
import * as healthController from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Full health check
 *     description: Comprehensive health check including database connectivity and uptime
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *       503:
 *         description: Application health check failed
 *
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Check if application is ready to accept requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 *
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     description: Check if application process is alive (Kubernetes liveness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application process is alive
 */

// No auth required for health checks
router.get('/', healthController.healthCheck);
router.get('/ready', healthController.readinessCheck);
router.get('/live', healthController.livenessCheck);

export default router;
