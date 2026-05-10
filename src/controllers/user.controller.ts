import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { users, total } = await userService.getUsers(pagination);
    return paginatedResponse(res, users, total, pagination.page, pagination.limit, MESSAGES.USER.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id as string);
    return successResponse(res, user, MESSAGES.USER.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.createUser(req.body);
    return successResponse(res, user, MESSAGES.USER.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateUser(req.params.id as string, req.body);
    return successResponse(res, user, MESSAGES.USER.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteUser(req.params.id as string);
    return successResponse(res, null, MESSAGES.USER.DELETED);
  } catch (error) {
    next(error);
  }
};
