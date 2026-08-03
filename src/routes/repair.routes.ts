import { Router } from 'express';
import * as repairController from '../controllers/repair.controller';
import * as callLogController from '../controllers/call-log.controller';
import { validate } from '../middlewares/validate.middleware';
import { createRepairJobSchema, updateRepairJobSchema, updateRepairStatusSchema } from '../validators/repair.validator';
import { createCallLogSchema } from '../validators/call-log.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';
import { upload } from '../middlewares/upload.middleware';

const router = Router();
const canWrite = roleMiddleware([ROLES.ADMIN, ROLES.STAFF, ROLES.TECHNICIAN]);

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
router.post('/', canWrite, validate(createRepairJobSchema), repairController.createRepairJob);
router.put('/:id', canWrite, validate(updateRepairJobSchema), repairController.updateRepairJob);
router.patch('/:id/status', canWrite, validate(updateRepairStatusSchema), repairController.updateRepairStatus);
router.post('/:id/calls', canWrite, validate(createCallLogSchema), callLogController.createCallLog);
router.get('/:id/calls', callLogController.getCallLogs);
router.delete('/:id', roleMiddleware([ROLES.ADMIN]), repairController.deleteRepairJob);
router.post('/:id/upload', canWrite, (req, res, next) => {
  req.params.type = 'repairs';
  next();
}, upload.single('image'), repairController.uploadRepairImage);

export default router;
