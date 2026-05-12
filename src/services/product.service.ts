import * as productRepository from '../repositories/product.repository';
import { MESSAGES } from '../constants/messages.constants';
import { generateProductCode } from '../utils/generate-code';

export const getProducts = async (pagination: any, filters: { search?: string, categoryId?: string }) => {
  const { skip, limit } = pagination;
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
    ];
  }

  const products = await productRepository.list({ skip, take: limit, where });
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

export const createProduct = async (payload: any) => {
  const productCode = await generateProductCode();
  
  return productRepository.create({
    ...payload,
    productCode,
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
