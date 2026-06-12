import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { MESSAGES } from '../constants/messages.constants';
import prisma from '../config/prisma.config';

export const getUsers = async (pagination: any, filters: { role?: string; search?: string; startDate?: string; endDate?: string } = {}) => {
  const { skip, limit, all } = pagination;
  const { role, search, startDate, endDate } = filters;

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

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  const users = await userRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
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

  const created = await userRepository.create({
    ...rest,
    email,
    password: hashedPassword,
    roleId: roleRecord.id,
    perDaySalary: rest.perDaySalary !== undefined ? rest.perDaySalary : 0,
    operationalStatus: rest.operationalStatus || "Active"
  });

  const { password: _pw, ...createdWithoutPassword } = created as any;
  return createdWithoutPassword;
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

  const { role, ...updateData } = payload;

  if (role) {
    const roleRecord = await prisma.role.findUnique({
      where: { name: role }
    });
    if (!roleRecord) {
      throw { statusCode: 400, message: 'Invalid role specified' };
    }
    updateData.roleId = roleRecord.id;
  }

  const updated = await userRepository.update(id, updateData);
  const { password: _pw, ...updatedWithoutPassword } = updated as any;
  return updatedWithoutPassword;
};

export const deleteUser = async (id: string) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw { statusCode: 404, message: MESSAGES.USER.NOT_FOUND };
  }

  return await userRepository.update(id, { operationalStatus: "Inactive" });
};
