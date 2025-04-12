import express from 'express';
import {
    getSavingGoals,
    getSavingGoal,
    createSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    contributeFunds,
    transferFromGoalToSavings
} from '../controllers/savingGoalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSavingGoals);
router.get('/:id', protect, getSavingGoal);
router.post('/', protect, createSavingGoal);
router.put('/:id', protect, updateSavingGoal);
router.delete('/:id', protect, deleteSavingGoal);
router.post('/:id/contribute', protect, contributeFunds);
router.post('/:id/transfer-to-savings', protect, transferFromGoalToSavings);

export default router; 