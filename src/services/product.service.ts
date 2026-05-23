import * as productRepository from '../repositories/product.repository';
import { MESSAGES } from '../constants/messages.constants';
import { generateProductCode } from '../utils/generate-code';
import prisma from '../config/prisma.config';

export const getProducts = async (pagination: any, filters: { search?: string, categoryId?: string }) => {
  const { skip, limit, all } = pagination;
  const { search, categoryId } = filters;

  const where: any = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { productCode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
      { shelf: { contains: search, mode: 'insensitive' } },
      { row: { contains: search, mode: 'insensitive' } },
    ];
  }

  const products = await productRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
  const total = await productRepository.count(where);

  return { products, total };
};

export const getProductById = async (id: string) => {
  const product = await productRepository.findById(id);

  if (!product) {
    throw { statusCode: 404, message: MESSAGES.PRODUCT.NOT_FOUND };
  }

  return product;
};

export const createProduct = async (payload: any, userId?: string) => {
  const productCode = await generateProductCode();
  const { stockQuantity = 0, ...rest } = payload;
  
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...rest,
        stockQuantity,
        productCode,
      },
    });

    if (stockQuantity > 0 && userId) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: 'IN',
          quantity: stockQuantity,
          previousStock: 0,
          currentStock: stockQuantity,
          referenceType: 'INITIAL',
          createdBy: userId,
        },
      });
    }

    return product;
  });
};

export const updateProduct = async (id: string, payload: any) => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw { statusCode: 404, message: MESSAGES.PRODUCT.NOT_FOUND };
  }

  return productRepository.update(id, payload);
};

export const deleteProduct = async (id: string) => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw { statusCode: 404, message: MESSAGES.PRODUCT.NOT_FOUND };
  }

  return productRepository.remove(id);
};

export const getLowStockProducts = async () => {
  return productRepository.getLowStock();
};
