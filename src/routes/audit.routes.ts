import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants';

const router = Router();

router.use(authMiddleware);

// Only Admin and Monitor roles can access the audit logs
router.get('/', roleMiddleware([ROLES.ADMIN, ROLES.MONITOR]), auditController.getAuditLogs);

export default router;
