import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, transactionController.getTransactions);
router.get('/:id', protect, transactionController.getTransaction);
router.post('/', protect, transactionController.createTransaction);
router.put('/:id', protect, transactionController.updateTransaction);
router.post('/transfer-income', protect, transactionController.transferIncomeToSection);

export default router;