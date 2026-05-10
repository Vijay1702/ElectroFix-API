import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { upload } from '../middlewares/upload.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/:type', upload.single('file'), uploadController.uploadFile);

export default router;
