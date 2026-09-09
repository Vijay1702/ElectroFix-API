import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all expense routes
router.use(authMiddleware);

// List expenses with filters
router.get('/', expenseController.getExpenses);

// Get expenses by date range
router.get('/date-range/search', expenseController.getExpensesByDateRange);

// Get total expenses
router.get('/summary/total', expenseController.getTotalExpenses);

// Get expense by ID
router.get('/:id', expenseController.getExpenseById);

// Create new expense
router.post('/', expenseController.createExpense);

// Update expense
router.put('/:id', expenseController.updateExpense);

// Delete expense
router.delete('/:id', expenseController.deleteExpense);

export default router;
