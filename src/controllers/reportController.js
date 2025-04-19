import * as reportService from '../services/reportService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import fs from 'fs-extra';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a PDF report for a specific month or year
export const generateReport = asyncHandler(async (req, res, next) => {
    try {
        const { period, value } = req.params;

        // Validate period
        if (period !== 'month' && period !== 'year') {
            return next(new ErrorResponse('Period must be either "month" or "year"', 400));
        }

        // Validate value
        if (period === 'month' && (parseInt(value) < 1 || parseInt(value) > 12)) {
            return next(new ErrorResponse('Month must be between 1 and 12', 400));
        }

        if (period === 'year' && (parseInt(value) < 2000 || parseInt(value) > 2100)) {
            return next(new ErrorResponse('Year must be between 2000 and 2100', 400));
        }

        const report = await reportService.generateReport(req.user.id, period, value);

        res.status(200).json({
            success: true,
            data: {
                filename: report.filename,
                period: report.period,
                value: report.value
            },
            message: 'Report generated successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Download a generated report
export const downloadReport = asyncHandler(async (req, res, next) => {
    try {
        const { filename } = req.params;

        // Build file path
        const filePath = path.join(process.cwd(), 'reports', filename);

        // Check if file exists
        if (!await fs.pathExists(filePath)) {
            return next(new ErrorResponse('Report not found', 404));
        }

        // Extract user ID from filename
        const filenameRegex = /report-(.+?)-/;
        const match = filename.match(filenameRegex);

        if (!match || match[1] !== req.user.id) {
            return next(new ErrorResponse('Unauthorized access to report', 403));
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        next(error);
    }
});

// @desc    Check API health status
// @route   GET /api/reports/status
// @access  Public
export const getStatus = asyncHandler(async (req, res) => {
    res.status(200).json({ message: 'API is operational' });
});

/**
 * Generate report for a specific month
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const generateMonthlyReport = async (req, res) => {
    try {
        const { month } = req.params;
        const userId = req.user.id;

        // Validate month parameter
        const monthNum = parseInt(month);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: 'Invalid month. Must be a number between 1 and 12.' });
        }

        const filename = await reportService.generateMonthlyReport(userId, monthNum);
        return res.status(200).json({ filename });
    } catch (error) {
        console.error('Error generating monthly report:', error);
        return res.status(500).json({ error: 'Failed to generate report' });
    }
};

/**
 * Generate report for a specific year
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const generateYearlyReport = async (req, res) => {
    try {
        const { year } = req.params;
        const userId = req.user.id;

        // Validate year parameter
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({ error: 'Invalid year. Must be a number between 2000 and 2100.' });
        }

        const filename = await reportService.generateYearlyReport(userId, yearNum);
        return res.status(200).json({ filename });
    } catch (error) {
        console.error('Error generating yearly report:', error);
        return res.status(500).json({ error: 'Failed to generate report' });
    }
};

