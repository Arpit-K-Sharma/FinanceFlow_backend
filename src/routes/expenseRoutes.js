import express from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, expenseController.createExpense);
router.get('/', protect, expenseController.getExpenses);
router.get('/:id', protect, expenseController.getExpense);
router.put('/:id', protect, expenseController.updateExpense);
router.delete('/:id', protect, expenseController.deleteExpense);

export default router;