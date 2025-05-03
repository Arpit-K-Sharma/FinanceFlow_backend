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
            // Log for debugging
            console.log('File access attempt:', {
                filename,
                extractedId: match ? match[1] : 'no match',
                userId: req.user.id
            });

            // Use a less strict comparison for IDs
            if (!match || String(match[1]) !== String(req.user.id)) {
                return next(new ErrorResponse('Unauthorized access to report', 403));
            }
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

// Get list of available reports for a user
export const listReports = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get reports directory
        const reportsDir = path.join(process.cwd(), 'reports');

        // Ensure the directory exists
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Read all files in the directory
        const files = fs.readdirSync(reportsDir);

        // Filter files that belong to this user
        // Format: report-userId-period-value-timestamp.pdf
        const userReports = files.filter(file => {
            const fileParts = file.split('-');
            // Check if file format matches and user ID matches
            return (
                file.startsWith('report-') &&
                file.endsWith('.pdf') &&
                fileParts.length >= 4 &&
                String(fileParts[1]) === String(userId)
            );
        });

        // Sort by date (newest first)
        userReports.sort((a, b) => {
            // Extract timestamps from filenames
            const timestampA = a.split('-').pop().replace('.pdf', '');
            const timestampB = b.split('-').pop().replace('.pdf', '');
            return parseInt(timestampB) - parseInt(timestampA);
        });

        res.json({
            success: true,
            count: userReports.length,
            reports: userReports
        });

    } catch (error) {
        next(error);
    }
};

// Delete a generated report
export const deleteReport = async (req, res, next) => {
    try {
        const { filename } = req.params;
        const userId = req.user.id;

        // Build file path
        const filePath = path.join(process.cwd(), 'reports', filename);

        // Check if file exists
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Extract user ID from filename and verify ownership
        const fileParts = filename.split('-');

        // Verify file belongs to this user
        // Format: report-userId-period-value-timestamp.pdf
        if (!filename.startsWith('report-') ||
            !filename.endsWith('.pdf') ||
            fileParts.length < 4 ||
            String(fileParts[1]) !== String(userId)) {

            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to report'
            });
        }

        // Delete the file
        await fs.unlink(filePath);

        res.status(200).json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        next(error);
    }
};

