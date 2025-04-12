import express from 'express';
import * as investmentController from '../controllers/investmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, investmentController.createInvestment);
router.get('/', protect, investmentController.getInvestments);
router.get('/:id', protect, investmentController.getInvestment);
router.put('/:id', protect, investmentController.updateInvestment);
router.delete('/:id', protect, investmentController.deleteInvestment);

export default router;