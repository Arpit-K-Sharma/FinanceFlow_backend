import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';
import { PrismaClient } from '@prisma/client';
import ErrorResponse from '../utils/errorResponse.js';

const prisma = new PrismaClient();

// Helper function to get start and end dates for month or year
const getDateRange = (period, value) => {
    if (period === 'month') {
        // Month is 0-indexed in JS Date (0 = January)
        const month = parseInt(value) - 1;
        const year = new Date().getFullYear();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        return { startDate, endDate };
    } else if (period === 'year') {
        const year = parseInt(value);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        return { startDate, endDate };
    }
    throw new ErrorResponse('Invalid period type. Must be month or year', 400);
};

// Helper to format currency consistently
const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
};

// Generate a financial report for a specific time period
export const generateReport = async (userId, period, value) => {
    try {
        // Get date range based on period and value
        const { startDate, endDate } = getDateRange(period, value);

        // Format date range for display
        const formattedStartDate = moment(startDate).format('MMMM DD, YYYY');
        const formattedEndDate = moment(endDate).format('MMMM DD, YYYY');
        const periodLabel = period === 'month' ? moment(startDate).format('MMMM YYYY') : value;

        // Make sure directory exists
        const reportsDir = path.join(process.cwd(), 'reports');
        await fs.ensureDir(reportsDir);

        // Create PDF filename
        const filename = `report-${userId}-${period}-${value}-${Date.now()}.pdf`;
        const filepath = path.join(reportsDir, filename);

        // Create a simple PDF document
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new ErrorResponse('User not found', 404);
        }

        // Fetch data for the report
        const [
            transactions,
            section,
            expenses,
            incomes,
            investments,
            savingGoals
        ] = await Promise.all([
            // Transactions during this period
            prisma.transaction.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            // Current section allocations
            prisma.section.findFirst({
                where: { userId }
            }),
            // Expenses during this period
            prisma.expense.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            // Income during this period
            prisma.income.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            // Investments during this period
            prisma.investment.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            // Saving goals
            prisma.savingGoal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Calculate totals
        const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const totalInvestments = investments.reduce((sum, investment) => sum + parseFloat(investment.amount), 0);
        const balance = totalIncome - totalExpenses - totalInvestments;

        // HEADER
        doc.font('Helvetica-Bold')
            .fontSize(16)
            .text('FINANCIAL REPORT', { align: 'center' })
            .moveDown(0.25);

        doc.fontSize(12)
            .text(`Period: ${periodLabel}`, { align: 'center' })
            .moveDown(0.25);

        doc.font('Helvetica')
            .fontSize(10)
            .text(`${formattedStartDate} to ${formattedEndDate}`, { align: 'center' })
            .moveDown(1);

        // Add a simple line
        doc.moveTo(50, doc.y)
            .lineTo(doc.page.width - 50, doc.y)
            .stroke();

        // USER INFORMATION
        doc.moveDown(0.5);
        doc.fontSize(10)
            .text(`Name: ${user.name}`, { align: 'left' })
            .text(`Email: ${user.email}`, { align: 'left' })
            .text(`Report Date: ${moment().format('MM/DD/YYYY')}`, { align: 'left' })
            .moveDown(1);

        // FINANCIAL SUMMARY
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('FINANCIAL SUMMARY', { align: 'left' })
            .moveDown(0.5);

        // Summary table with custom formatting
        const createSimpleTable = (items) => {
            const width = doc.page.width - 100;
            items.forEach((item, index) => {
                // Draw light gray background for alternating rows
                if (index % 2 === 1) {
                    doc.rect(50, doc.y, width, 20).fill('#f5f5f5');
                }

                doc.fillColor('black');
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(item.label, 60, doc.y + 5, { width: 200 });

                doc.font('Helvetica-Bold')
                    .text(item.value, 260, doc.y - 10, { width: width - 210, align: 'right' });

                doc.moveDown(0.75);
            });
        };

        createSimpleTable([
            { label: 'Total Income', value: formatCurrency(totalIncome) },
            { label: 'Total Expenses', value: formatCurrency(totalExpenses) },
            { label: 'Total Investments', value: formatCurrency(totalInvestments) },
            { label: 'Net Balance', value: formatCurrency(balance) }
        ]);

        doc.moveDown(0.5);

        // Add a summary statement
        doc.font('Helvetica')
            .fontSize(10);

        if (balance > 0) {
            doc.text(`For this period, you had a positive balance of ${formatCurrency(balance)}. This means your income exceeded your expenses and investments.`);
        } else if (balance < 0) {
            doc.text(`For this period, you had a negative balance of ${formatCurrency(Math.abs(balance))}. This means your expenses and investments exceeded your income.`);
        } else {
            doc.text(`For this period, your balance was exactly zero. Your income matched your expenses and investments perfectly.`);
        }

        doc.moveDown(1);

        // INCOME BREAKDOWN
        if (incomes.length > 0) {
            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('INCOME BREAKDOWN', { align: 'left' })
                .moveDown(0.5);

            // Group incomes by source
            const incomesBySource = {};
            incomes.forEach(income => {
                const source = income.source || 'Other';
                if (!incomesBySource[source]) {
                    incomesBySource[source] = 0;
                }
                incomesBySource[source] += parseFloat(income.amount);
            });

            // Display sources as a table
            doc.font('Helvetica-Bold')
                .fontSize(9)
                .text('Source', 60, doc.y, { width: 200 })
                .text('Amount', 260, doc.y, { width: 100, align: 'right' })
                .text('% of Total', 360, doc.y, { width: 100, align: 'right' })
                .moveDown(0.5);

            // Add a line under the headers
            const tableWidth = doc.page.width - 100;
            doc.moveTo(50, doc.y - 5)
                .lineTo(50 + tableWidth, doc.y - 5)
                .stroke();

            // Table rows
            Object.entries(incomesBySource)
                .sort((a, b) => b[1] - a[1])
                .forEach((entry, index) => {
                    const [source, amount] = entry;
                    const percent = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0.0';

                    // Alternate row backgrounds
                    if (index % 2 === 1) {
                        doc.rect(50, doc.y, tableWidth, 18).fill('#f5f5f5');
                    }

                    doc.fillColor('black')
                        .font('Helvetica')
                        .fontSize(9)
                        .text(source, 60, doc.y + 5, { width: 200 })
                        .text(formatCurrency(amount), 260, doc.y, { width: 100, align: 'right' })
                        .text(`${percent}%`, 360, doc.y, { width: 100, align: 'right' });

                    doc.moveDown(0.75);
                });

            doc.moveDown(0.5);

            // Income details - only if there are fewer than 10 incomes to keep it simple
            if (incomes.length < 10) {
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .text('Income Details:', { underline: true })
                    .moveDown(0.5);

                incomes.forEach(income => {
                    const date = moment(income.createdAt).format('MM/DD/YYYY');
                    doc.fontSize(9)
                        .text(`${date} - ${income.source || 'Other'}: ${formatCurrency(income.amount)} - ${income.description || 'No description'}`);
                });
            }

            doc.moveDown(1);
        }

        // EXPENSE BREAKDOWN
        if (expenses.length > 0) {
            // Add a page break if we're getting low on space
            if (doc.y > doc.page.height - 250) {
                doc.addPage();
            }

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('EXPENSE BREAKDOWN', { align: 'left' })
                .moveDown(0.5);

            // Group expenses by category
            const expensesByCategory = {};
            expenses.forEach(expense => {
                const category = expense.category || 'Uncategorized';
                if (!expensesByCategory[category]) {
                    expensesByCategory[category] = 0;
                }
                expensesByCategory[category] += parseFloat(expense.amount);
            });

            // Display categories as a table
            doc.font('Helvetica-Bold')
                .fontSize(9)
                .text('Category', 60, doc.y, { width: 200 })
                .text('Amount', 260, doc.y, { width: 100, align: 'right' })
                .text('% of Total', 360, doc.y, { width: 100, align: 'right' })
                .moveDown(0.5);

            // Add a line under the headers
            const tableWidth = doc.page.width - 100;
            doc.moveTo(50, doc.y - 5)
                .lineTo(50 + tableWidth, doc.y - 5)
                .stroke();

            // Table rows
            Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .forEach((entry, index) => {
                    const [category, amount] = entry;
                    const percent = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0';

                    // Alternate row backgrounds
                    if (index % 2 === 1) {
                        doc.rect(50, doc.y, tableWidth, 18).fill('#f5f5f5');
                    }

                    doc.fillColor('black')
                        .font('Helvetica')
                        .fontSize(9)
                        .text(category, 60, doc.y + 5, { width: 200 })
                        .text(formatCurrency(amount), 260, doc.y, { width: 100, align: 'right' })
                        .text(`${percent}%`, 360, doc.y, { width: 100, align: 'right' });

                    doc.moveDown(0.75);
                });

            doc.moveDown(0.5);

            // Expense details would make the report too long, so we'll skip that

            doc.moveDown(1);
        }

        // INVESTMENT SUMMARY
        if (investments.length > 0) {
            // Add a page break if we're getting low on space
            if (doc.y > doc.page.height - 250) {
                doc.addPage();
            }

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('INVESTMENT SUMMARY', { align: 'left' })
                .moveDown(0.5);

            // Group investments by type
            const investmentsByType = {};
            investments.forEach(investment => {
                const type = investment.type || 'Other';
                if (!investmentsByType[type]) {
                    investmentsByType[type] = 0;
                }
                investmentsByType[type] += parseFloat(investment.amount);
            });

            // Display types as a table
            doc.font('Helvetica-Bold')
                .fontSize(9)
                .text('Type', 60, doc.y, { width: 200 })
                .text('Amount', 260, doc.y, { width: 100, align: 'right' })
                .text('% of Total', 360, doc.y, { width: 100, align: 'right' })
                .moveDown(0.5);

            // Add a line under the headers
            const tableWidth = doc.page.width - 100;
            doc.moveTo(50, doc.y - 5)
                .lineTo(50 + tableWidth, doc.y - 5)
                .stroke();

            // Table rows
            Object.entries(investmentsByType)
                .sort((a, b) => b[1] - a[1])
                .forEach((entry, index) => {
                    const [type, amount] = entry;
                    const percent = totalInvestments > 0 ? ((amount / totalInvestments) * 100).toFixed(1) : '0.0';

                    // Alternate row backgrounds
                    if (index % 2 === 1) {
                        doc.rect(50, doc.y, tableWidth, 18).fill('#f5f5f5');
                    }

                    doc.fillColor('black')
                        .font('Helvetica')
                        .fontSize(9)
                        .text(type, 60, doc.y + 5, { width: 200 })
                        .text(formatCurrency(amount), 260, doc.y, { width: 100, align: 'right' })
                        .text(`${percent}%`, 360, doc.y, { width: 100, align: 'right' });

                    doc.moveDown(0.75);
                });

            doc.moveDown(1);
        }

        // SAVING GOALS
        if (savingGoals.length > 0) {
            // Add a page break if we're getting low on space
            if (doc.y > doc.page.height - 250) {
                doc.addPage();
            }

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('SAVING GOALS', { align: 'left' })
                .moveDown(0.5);

            // Display goals as a table
            doc.font('Helvetica-Bold')
                .fontSize(9)
                .text('Goal', 60, doc.y, { width: 150 })
                .text('Target', 210, doc.y, { width: 80, align: 'right' })
                .text('Current', 290, doc.y, { width: 80, align: 'right' })
                .text('Progress', 370, doc.y, { width: 70, align: 'right' })
                .moveDown(0.5);

            // Add a line under the headers
            const tableWidth = doc.page.width - 100;
            doc.moveTo(50, doc.y - 5)
                .lineTo(50 + tableWidth, doc.y - 5)
                .stroke();

            // Table rows
            savingGoals.forEach((goal, index) => {
                const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);

                // Alternate row backgrounds
                if (index % 2 === 1) {
                    doc.rect(50, doc.y, tableWidth, 18).fill('#f5f5f5');
                }

                doc.fillColor('black')
                    .font('Helvetica')
                    .fontSize(9)
                    .text(goal.name, 60, doc.y + 5, { width: 150 })
                    .text(formatCurrency(goal.targetAmount), 210, doc.y, { width: 80, align: 'right' })
                    .text(formatCurrency(goal.currentAmount), 290, doc.y, { width: 80, align: 'right' })
                    .text(`${progress}%`, 370, doc.y, { width: 70, align: 'right' });

                doc.moveDown(0.75);
            });

            doc.moveDown(1);
        }

        // CONCLUSION
        // Add a page break if we're getting low on space
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
        }

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('SUMMARY AND RECOMMENDATIONS', { align: 'left' })
            .moveDown(0.5);

        doc.font('Helvetica')
            .fontSize(10);

        // Provide insights based on the financial data
        if (balance < 0) {
            doc.text('• Your expenses exceed your income. Consider reducing expenses or finding additional sources of income.');
        } else {
            const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
            if (savingsRate < 20) {
                doc.text(`• Your current savings rate is ${savingsRate.toFixed(1)}%. Consider aiming for at least 20%.`);
            } else {
                doc.text(`• Your savings rate of ${savingsRate.toFixed(1)}% is good. Consider investing more for long-term growth.`);
            }
        }

        doc.moveDown(0.5);

        // Add additional standard recommendations
        doc.text('• Review your budget regularly and adjust as needed.')
            .moveDown(0.5);

        if (totalInvestments === 0) {
            doc.text('• Consider starting an investment plan to grow your wealth over time.');
        }

        doc.moveDown(0.5);
        doc.text('• Ensure you have an emergency fund of 3-6 months of expenses.');

        // Add footer
        doc.fontSize(8)
            .text(`This report was generated on ${moment().format('MM/DD/YYYY [at] h:mm A')}. For questions about this report, please contact support.`, {
                align: 'center'
            });

        // Finalize PDF
        doc.end();

        // Wait for the PDF to be fully written
        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                resolve({
                    filename,
                    filepath,
                    period,
                    value,
                    startDate,
                    endDate
                });
            });

            stream.on('error', reject);
        });

    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}; 