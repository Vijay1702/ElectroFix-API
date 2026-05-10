import { Prisma, User } from '@prisma/client';
import prisma from '../config/prisma.config';

export const findByEmail = async (email: string): Promise<(User & { role: { name: string } }) | null> => {
  return prisma.user.findUnique({
    where: { email },
    include: { role: { select: { name: true } } },
  });
};

export const findById = async (id: string): Promise<(User & { role: { name: string } }) | null> => {
  return prisma.user.findUnique({
    where: { id },
    include: { role: { select: { name: true } } },
  });
};

export const create = async (data: Prisma.UserCreateInput): Promise<User> => {
  return prisma.user.create({
    data,
  });
};

export const update = async (id: string, data: Prisma.UserUpdateInput): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

export const list = async (params: { skip?: number; take?: number; where?: Prisma.UserWhereInput }): Promise<User[]> => {
  return prisma.user.findMany({
    ...params,
    orderBy: { createdAt: 'desc' },
  });
};

export const count = async (where?: Prisma.UserWhereInput): Promise<number> => {
  return prisma.user.count({ where });
};

export const remove = async (id: string): Promise<User> => {
  return prisma.user.delete({
    where: { id },
  });
};
