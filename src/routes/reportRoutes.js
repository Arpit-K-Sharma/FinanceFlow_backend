import express from 'express';
import * as reportController from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireEmailVerified } from '../middleware/verifyEmailMiddleware.js';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/status', reportController.getStatus);

// Apply authentication middleware to all report routes
router.use(protect);

// Apply email verification requirement to report generation and download
// Generate a PDF report for a specific month or year
router.get('/generate/:period/:value', requireEmailVerified, reportController.generateReport);

// Download a generated report
router.get('/download/:filename', requireEmailVerified, reportController.downloadReport);

export default router; 