import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { products, total } = await productService.getProducts(pagination);
    return paginatedResponse(res, products, total, pagination.page, pagination.limit, MESSAGES.PRODUCT.FETCHED);
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

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.createProduct(req.body);
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
