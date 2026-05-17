import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

router.get('/', attendanceController.getAttendance);
router.post('/bulk', roleMiddleware([ROLES.ADMIN]), attendanceController.saveAttendanceBulk);
router.get('/payroll', roleMiddleware([ROLES.ADMIN]), attendanceController.getPayroll);

export default router;
