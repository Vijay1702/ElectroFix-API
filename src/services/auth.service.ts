import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userRepository from '../repositories/user.repository';
import { env } from '../config/env.config';
import { MESSAGES } from '../constants/messages.constants';
import { AuthUser } from '../types/express.d';

export const login = async (payload: any) => {
  const { email, password } = payload;

  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw { statusCode: 401, message: MESSAGES.AUTH.INVALID_CREDENTIALS };
  }

  if (!user.isActive) {
    throw { statusCode: 403, message: MESSAGES.USER.INACTIVE };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw { statusCode: 401, message: MESSAGES.AUTH.INVALID_CREDENTIALS };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
  };

  const accessToken = jwt.sign(authUser, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });

  return {
    user: authUser,
    accessToken,
    refreshToken,
  };
};

export const getProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw { statusCode: 404, message: MESSAGES.USER.NOT_FOUND };
  }

  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    role: user.role.name,
  };
};

export const refreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      throw { statusCode: 401, message: MESSAGES.AUTH.TOKEN_INVALID };
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
    };

    const accessToken = jwt.sign(authUser, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    return { accessToken };
  } catch (error) {
    throw { statusCode: 401, message: MESSAGES.AUTH.TOKEN_INVALID };
  }
};
