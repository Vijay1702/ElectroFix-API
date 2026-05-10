import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository';
import { MESSAGES } from '../constants/messages.constants';

export const getUsers = async (pagination: any) => {
  const { skip, limit } = pagination;
  const users = await userRepository.list({ skip, take: limit });
  const total = await userRepository.count();

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
  const { email, password, ...rest } = payload;

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw { statusCode: 400, message: MESSAGES.USER.EMAIL_EXISTS };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return userRepository.create({
    ...rest,
    email,
    password: hashedPassword,
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
