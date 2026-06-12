import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customer.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';
import * as auditService from '../services/audit.service';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { search, startDate, endDate } = req.query;
    const { customers, total } = await customerService.getCustomers(
      pagination, 
      search as string, 
      startDate as string, 
      endDate as string
    );
    const limit = pagination.all ? total : pagination.limit;
    return paginatedResponse(res, customers, total, pagination.page, limit, MESSAGES.CUSTOMER.FETCHED);
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

export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    await auditService.logAction(req.user?.id || null, 'Customers', 'CREATE', `Created customer ${customer.fullName}`, customer.id);
    return successResponse(res, customer, MESSAGES.CUSTOMER.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id as string, req.body);
    await auditService.logAction(req.user?.id || null, 'Customers', 'UPDATE', `Updated customer ${customer.fullName}`, customer.id);
    return successResponse(res, customer, MESSAGES.CUSTOMER.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customerId = req.params.id as string;
    await customerService.deleteCustomer(customerId);
    await auditService.logAction(req.user?.id || null, 'Customers', 'DELETE', `Deleted customer with ID ${customerId}`, customerId);
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
