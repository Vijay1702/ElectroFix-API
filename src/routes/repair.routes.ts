import { Router } from 'express';
import * as repairController from '../controllers/repair.controller';
import { validate } from '../middlewares/validate.middleware';
import { createRepairJobSchema, updateRepairJobSchema, updateRepairStatusSchema } from '../validators/repair.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /repair-jobs:
 *   get:
 *     summary: List all repair jobs
 *     tags: [Repair Jobs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of repairs
 *   post:
 *     summary: Create a new repair job
 *     tags: [Repair Jobs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, deviceType, problemDescription]
 *             properties:
 *               customerId: { type: string }
 *               deviceType: { type: string }
 *               brand: { type: string }
 *               model: { type: string }
 *               problemDescription: { type: string }
 *               estimatedCost: { type: number }
 *     responses:
 *       201:
 *         description: Repair job created
 */
router.get('/', repairController.getRepairJobs);
router.get('/:id', repairController.getRepairJobById);
router.get('/:id/timeline', repairController.getRepairTimeline);
router.post('/', validate(createRepairJobSchema), repairController.createRepairJob);
router.put('/:id', validate(updateRepairJobSchema), repairController.updateRepairJob);
router.patch('/:id/status', validate(updateRepairStatusSchema), repairController.updateRepairStatus);
router.delete('/:id', repairController.deleteRepairJob);
router.post('/:id/upload', (req, res, next) => {
  req.params.type = 'repairs';
  next();
}, upload.single('image'), repairController.uploadRepairImage);

export default router;
