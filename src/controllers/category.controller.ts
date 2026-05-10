import { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/category.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryService.getCategories();
    return successResponse(res, categories, MESSAGES.CATEGORY.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await categoryService.createCategory(req.body);
    return successResponse(res, category, MESSAGES.CATEGORY.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await categoryService.updateCategory(req.params.id as string, req.body);
    return successResponse(res, category, MESSAGES.CATEGORY.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await categoryService.deleteCategory(req.params.id as string);
    return successResponse(res, null, MESSAGES.CATEGORY.DELETED);
  } catch (error) {
    next(error);
  }
};
