import { Prisma, Product } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<(Product & { category: any }) | null> => {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
};

export const create = async (data: Prisma.ProductCreateInput): Promise<Product> => {
  return prisma.product.create({
    data,
  });
};

export const update = async (id: string, data: Prisma.ProductUpdateInput): Promise<Product> => {
  return prisma.product.update({
    where: { id },
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.ProductWhereInput }): Promise<Product[]> => {
  return prisma.product.findMany({
    ...params,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.ProductWhereInput): Promise<number> => {
  return prisma.product.count({ where });
};

export const remove = async (id: string): Promise<Product> => {
  return prisma.$transaction(async (tx) => {
    // Check if the product has been billed in any invoices
    const invoiceCount = await tx.invoiceItem.count({ where: { productId: id } });
    if (invoiceCount > 0) {
      throw { statusCode: 400, message: "Cannot delete product. It has already been billed in one or more invoices." };
    }

    // Safely delete associated stock movements first
    await tx.stockMovement.deleteMany({
      where: { productId: id },
    });

    // Delete the product
    return tx.product.delete({
      where: { id },
    });
  });
};

export const getLowStock = async (): Promise<Product[]> => {
  // Products where stock_quantity <= minimum_stock
  const products = await prisma.$queryRaw`
    SELECT * FROM "Product" 
    WHERE "stockQuantity" <= "minimumStock"
    ORDER BY "stockQuantity" ASC
  `;
  return products as Product[];
};
