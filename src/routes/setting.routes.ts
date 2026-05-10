import { Router } from 'express';
import * as settingController from '../controllers/setting.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all system settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of settings
 *   put:
 *     summary: Update a system setting
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key: { type: string }
 *               value: { type: string }
 *     responses:
 *       200:
 *         description: Setting updated
 */
router.get('/', settingController.getSettings);
router.put('/', roleMiddleware([ROLES.ADMIN]), settingController.updateSetting);

export default router;
