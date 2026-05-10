import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid('Invalid category ID'),
    name: z.string().min(1, 'Product name is required'),
    brand: z.string().optional(),
    purchasePrice: z.number().min(0),
    sellingPrice: z.number().min(0),
    stockQuantity: z.number().int().min(0),
    minimumStock: z.number().int().min(0),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    brand: z.string().optional(),
    purchasePrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    minimumStock: z.number().int().min(0).optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
  }),
});
