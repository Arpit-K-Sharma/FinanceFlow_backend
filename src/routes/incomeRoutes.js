import express from 'express';
import { addIncome, getAvailableIncome } from '../controllers/incomeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, addIncome);
router.get('/available', protect, getAvailableIncome);

export default router; 