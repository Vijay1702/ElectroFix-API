import { Prisma, Category } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findById = async (id: string): Promise<Category | null> => {
  return prisma.category.findUnique({
    where: { id },
  });
};

export const create = async (data: Prisma.CategoryCreateInput): Promise<Category> => {
  return prisma.category.create({
    data,
  });
};

export const update = async (id: string, data: Prisma.CategoryUpdateInput): Promise<Category> => {
  return prisma.category.update({
    where: { id },
    data,
  });
};

export const list = async (): Promise<Category[]> => {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
};

export const remove = async (id: string): Promise<Category> => {
  return prisma.category.delete({
    where: { id },
  });
};
