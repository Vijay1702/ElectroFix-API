import * as categoryRepository from '../repositories/category.repository';
import { MESSAGES } from '../constants/messages.constants';

export const getCategories = async () => {
  return categoryRepository.list();
};

export const createCategory = async (payload: any) => {
  return categoryRepository.create(payload);
};

export const updateCategory = async (id: string, payload: any) => {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw { statusCode: 404, message: MESSAGES.CATEGORY.NOT_FOUND };
  }
  return categoryRepository.update(id, payload);
};

export const deleteCategory = async (id: string) => {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw { statusCode: 404, message: MESSAGES.CATEGORY.NOT_FOUND };
  }
  return categoryRepository.remove(id);
};
