import express from 'express';
import * as sectionController from '../controllers/sectionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, sectionController.getSection);
router.put('/', protect, sectionController.updateSection);
router.post('/distribute', protect, sectionController.distributeMoney);

export default router;