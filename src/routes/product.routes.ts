import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { validate } from '../middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { ROLES } from '../constants/roles.constants';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of inventory products
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, categoryId, purchasePrice, sellingPrice, stockQuantity]
 *             properties:
 *               name: { type: string }
 *               categoryId: { type: string }
 *               purchasePrice: { type: number }
 *               sellingPrice: { type: number }
 *               stockQuantity: { type: integer }
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/', productController.getProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProductById);
router.post('/', roleMiddleware([ROLES.ADMIN]), validate(createProductSchema), productController.createProduct);
router.put('/:id', roleMiddleware([ROLES.ADMIN]), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', roleMiddleware([ROLES.ADMIN]), productController.deleteProduct);

export default router;
