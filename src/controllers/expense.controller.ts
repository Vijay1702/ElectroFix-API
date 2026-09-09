import { Request, Response, NextFunction } from 'express';
import * as expenseService from '../services/expense.service';
import { successResponse, paginatedResponse, errorResponse } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';
import { MESSAGES } from '../constants/messages.constants';
import * as auditService from '../services/audit.service';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { search, startDate, endDate } = req.query;
    const { expenses, total } = await expenseService.getExpenses(
      pagination,
      search as string,
      startDate as string,
      endDate as string
    );
    const limit = pagination.all ? total : pagination.limit;
    return paginatedResponse(res, expenses, total, pagination.page, limit, 'Expenses fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id as string);
    return successResponse(res, expense, 'Expense fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user?.id
    };

    const expense = await expenseService.createExpense(payload);
    return successResponse(res, expense, 'Expense created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const expense = await expenseService.updateExpense(id as string, req.body);
    return successResponse(res, expense, 'Expense updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await expenseService.deleteExpense(id as string);
    return successResponse(res, { message: 'Expense deleted successfully' }, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getExpensesByDateRange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(res, 'Start date and end date are required', 400);
    }

    const expenses = await expenseService.getExpensesByDateRange(startDate as string, endDate as string);
    return successResponse(res, expenses, 'Expenses fetched successfully');
  } catch (error) {
    next(error);
  }
};


export const getTotalExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await expenseService.getTotalExpenses(startDate as string, endDate as string);
    return successResponse(res, result, 'Total expenses calculated successfully');
  } catch (error) {
    next(error);
  }
};
