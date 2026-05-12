import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { MESSAGES } from '../constants/messages.constants';
import prisma from '../config/prisma.config';

export const getUsers = async (pagination: any, filters: { role?: string; search?: string } = {}) => {
  const { skip, limit } = pagination;
  const { role, search } = filters;

  const where: any = {};

  if (role) {
    where.role = { name: role };
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await userRepository.list({ skip, take: limit, where });
  const total = await userRepository.count(where);

  // Remove passwords from response
  const usersWithoutPasswords = users.map((user: any) => {
    const { password, ...u } = user;
    return u;
  });

  return { users: usersWithoutPasswords, total };
};

export const getUserById = async (id: string) => {
  const user = await userRepository.findById(id);

  if (!user) {
    throw { statusCode: 404, message: MESSAGES.USER.NOT_FOUND };
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const createUser = async (payload: any) => {
  const { email, password, role, ...rest } = payload;

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw { statusCode: 400, message: MESSAGES.USER.EMAIL_EXISTS };
  }

  // Resolve roleId from name
  const roleRecord = await prisma.role.findUnique({
    where: { name: role || 'TECHNICIAN' }
  });

  if (!roleRecord) {
    throw { statusCode: 400, message: 'Invalid role specified' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return userRepository.create({
    ...rest,
    email,
    password: hashedPassword,
    roleId: roleRecord.id
  });
};

export const updateUser = async (id: string, payload: any) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw { statusCode: 404, message: MESSAGES.USER.NOT_FOUND };
  }

  if (payload.email && payload.email !== user.email) {
    const existingUser = await userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw { statusCode: 400, message: MESSAGES.USER.EMAIL_EXISTS };
    }
  }

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  return userRepository.update(id, payload);
};

export const deleteUser = async (id: string) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw { statusCode: 404, message: MESSAGES.USER.NOT_FOUND };
  }

  return userRepository.remove(id);
};
