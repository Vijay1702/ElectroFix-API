import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import * as productService from '../services/product.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { search, categoryId } = req.query;
    const { products, total } = await productService.getProducts(pagination, {
      search: search as string,
      categoryId: categoryId as string
    });
    const limit = pagination.all ? total : pagination.limit;
    return paginatedResponse(res, products, total, pagination.page, limit, MESSAGES.PRODUCT.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProductById(req.params.id as string);
    return successResponse(res, product, MESSAGES.PRODUCT.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const product = await productService.createProduct(req.body, userId);
    return successResponse(res, product, MESSAGES.PRODUCT.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    return successResponse(res, product, MESSAGES.PRODUCT.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.deleteProduct(req.params.id as string);
    return successResponse(res, null, MESSAGES.PRODUCT.DELETED);
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getLowStockProducts();
    return successResponse(res, products, MESSAGES.PRODUCT.LOW_STOCK_FETCHED);
  } catch (error) {
    next(error);
  }
};
