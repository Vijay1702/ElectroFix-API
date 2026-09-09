import * as expenseRepository from '../repositories/expense.repository';
import { MESSAGES } from '../constants/messages.constants';

export const getExpenses = async (pagination: any, search?: string, startDate?: string, endDate?: string) => {
  const { skip, limit, all } = pagination;

  const where: any = {};

  if (search) {
    where.OR = [
      { expenseName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const expenses = await expenseRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where,
    orderBy: {
      expenseDate: 'desc'
    }
  });

  const total = await expenseRepository.count(where);

  return { expenses, total };
};

export const getExpenseById = async (id: string) => {
  const expense = await expenseRepository.findById(id);

  if (!expense) {
    throw { statusCode: 404, message: 'Expense not found' };
  }

  return expense;
};

export const createExpense = async (payload: any) => {
  if (!payload.expenseName) {
    throw { statusCode: 400, message: 'Expense name is required' };
  }

  if (!payload.amount || payload.amount <= 0) {
    throw { statusCode: 400, message: 'Amount must be greater than 0' };
  }

  if (!payload.createdBy) {
    throw { statusCode: 400, message: 'Created by user ID is required' };
  }

  return expenseRepository.create({
    expenseName: payload.expenseName,
    amount: payload.amount,
    description: payload.description || null,
    expenseDate: payload.expenseDate || new Date(),
    createdBy: payload.createdBy
  });
};

export const updateExpense = async (id: string, payload: any) => {
  const expense = await expenseRepository.findById(id);
  if (!expense) {
    throw { statusCode: 404, message: 'Expense not found' };
  }

  const updateData: any = {};

  if (payload.expenseName) updateData.expenseName = payload.expenseName;
  if (payload.amount !== undefined) updateData.amount = payload.amount;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.expenseDate) updateData.expenseDate = payload.expenseDate;

  return expenseRepository.update(id, updateData);
};

export const deleteExpense = async (id: string) => {
  const expense = await expenseRepository.findById(id);
  if (!expense) {
    throw { statusCode: 404, message: 'Expense not found' };
  }

  return expenseRepository.remove(id);
};

export const getExpensesByDateRange = async (startDate: string, endDate: string) => {
  return expenseRepository.getExpensesByDateRange(startDate, endDate);
};


export const getTotalExpenses = async (startDate?: string, endDate?: string) => {
  const where: any = {};

  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const expenses = await expenseRepository.list({ where });
  const total = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);

  return { total, count: expenses.length };
};
