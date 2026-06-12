import * as stockRepository from '../repositories/stock.repository';
import * as productRepository from '../repositories/product.repository';
import { MESSAGES } from '../constants/messages.constants';
import { STOCK_MOVEMENT_TYPE } from '../constants/stock-movement.constants';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.config';

export const getStockMovements = async (pagination: any, filters?: { startDate?: string; endDate?: string }) => {
  const { skip, limit, all } = pagination;
  
  const where: any = {};
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
       const end = new Date(filters.endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  const movements = await stockRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
  const total = await stockRepository.count(where);

  return { movements, total };
};

export const createStockMovement = async (payload: any, userId: string) => {
  const { productId, movementType, quantity, referenceType, referenceId } = payload;

  const product = await productRepository.findById(productId);
  if (!product) {
    throw { statusCode: 404, message: MESSAGES.PRODUCT.NOT_FOUND };
  }

  const previousStock = product.stockQuantity;
  let currentStock = previousStock;

  if (movementType === STOCK_MOVEMENT_TYPE.IN) {
    currentStock += quantity;
  } else if (movementType === STOCK_MOVEMENT_TYPE.OUT) {
    if (previousStock < quantity) {
      throw { statusCode: 400, message: 'Insufficient stock' };
    }
    currentStock -= quantity;
  } else if (movementType === STOCK_MOVEMENT_TYPE.ADJUSTMENT) {
    // For adjustment, quantity can be positive or negative
    currentStock += quantity;
  }

  // Use a transaction to ensure atomicity
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create stock movement
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        movementType,
        quantity,
        previousStock,
        currentStock,
        referenceType,
        referenceId,
        createdBy: userId,
      },
    });

    // Update product stock
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: currentStock },
    });

    return movement;
  });
};
