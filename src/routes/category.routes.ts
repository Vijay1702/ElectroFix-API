import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { validate } from '../middlewares/validate.middleware';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

router.get('/', categoryController.getCategories);
router.post('/', roleMiddleware([ROLES.ADMIN]), validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', roleMiddleware([ROLES.ADMIN]), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', roleMiddleware([ROLES.ADMIN]), categoryController.deleteCategory);

export default router;
