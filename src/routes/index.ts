import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import customerRoutes from './customer.routes';
import repairRoutes from './repair.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import stockRoutes from './stock.routes';
import invoiceRoutes from './invoice.routes';
import paymentRoutes from './payment.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import settingRoutes from './setting.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/repair-jobs', repairRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingRoutes);
router.use('/uploads', uploadRoutes);

export default router;
