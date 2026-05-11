import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customer.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const search = req.query.search as string;
    const { customers, total } = await customerService.getCustomers(pagination, search);
    return paginatedResponse(res, customers, total, pagination.page, pagination.limit, MESSAGES.CUSTOMER.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id as string);
    return successResponse(res, customer, MESSAGES.CUSTOMER.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return successResponse(res, customer, MESSAGES.CUSTOMER.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id as string, req.body);
    return successResponse(res, customer, MESSAGES.CUSTOMER.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await customerService.deleteCustomer(req.params.id as string);
    return successResponse(res, null, MESSAGES.CUSTOMER.DELETED);
  } catch (error) {
    next(error);
  }
};

export const getCustomerHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await customerService.getCustomerHistory(req.params.id as string);
    return successResponse(res, history, MESSAGES.CUSTOMER.HISTORY_FETCHED);
  } catch (error) {
    next(error);
  }
};
