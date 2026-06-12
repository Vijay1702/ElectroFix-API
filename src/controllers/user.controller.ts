import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';
import * as auditService from '../services/audit.service';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { role, search, startDate, endDate } = req.query;
    const { users, total } = await userService.getUsers(pagination, { 
      role: role as string, 
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    const limit = pagination.all ? total : pagination.limit;
    return paginatedResponse(res, users, total, pagination.page, limit, MESSAGES.USER.FETCHED);
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

export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.createUser(req.body);
    await auditService.logAction(req.user?.id || null, 'Users', 'CREATE', `Created user ${user.fullName}`, user.id);
    return successResponse(res, user, MESSAGES.USER.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.updateUser(req.params.id as string, req.body);
    await auditService.logAction(req.user?.id || null, 'Users', 'UPDATE', `Updated user ${user.fullName}`, user.id);
    return successResponse(res, user, MESSAGES.USER.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string;
    await userService.deleteUser(userId);
    await auditService.logAction(req.user?.id || null, 'Users', 'DELETE', `Deleted user with ID ${userId}`, userId);
    return successResponse(res, null, MESSAGES.USER.DELETED);
  } catch (error) {
    next(error);
  }
};
