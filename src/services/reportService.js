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

        // Log the filename and userId for debugging
        console.log('Generating report:', {
            filename,
            userId,
            userIdType: typeof userId
        });

        // Create a simple PDF document
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Helper function to create standardized data tables
        const createDataTable = (headers, data, startY, options = {}) => {
            const { columnWidths = [], formatter = null } = options;
            const tableWidth = doc.page.width - 100;
            const rowHeight = 20; // Standard row height

            // Draw headers
            doc.font('Helvetica-Bold').fontSize(9);
            let currentX = 60;

            headers.forEach((header, i) => {
                const width = columnWidths[i] || tableWidth / headers.length;
                const align = i === 0 ? 'left' : 'right';
                doc.text(header, currentX, startY, { width, align });
                currentX += width;
            });

            doc.moveDown(0.5);

            // Add a line under the headers
            doc.moveTo(50, doc.y - 5)
                .lineTo(50 + tableWidth, doc.y - 5)
                .stroke();

            // Draw data rows
            data.forEach((row, rowIndex) => {
                // Alternate row backgrounds
                if (rowIndex % 2 === 1) {
                    doc.rect(50, doc.y, tableWidth, rowHeight).fill('#f5f5f5');
                }

                const yPos = doc.y + 5; // Consistent y position for text
                currentX = 60;

                doc.fillColor('black').font('Helvetica').fontSize(9);

                // Display each cell in the row
                row.forEach((cell, cellIndex) => {
                    const width = columnWidths[cellIndex] || tableWidth / headers.length;
                    const align = cellIndex === 0 ? 'left' : 'right';
                    const formattedValue = formatter && typeof formatter === 'function' ?
                        formatter(cell, cellIndex) : cell;

                    doc.text(formattedValue, currentX, yPos, { width, align });
                    currentX += width;
                });

                doc.moveDown(1);
            });
        };

        // Helper function for simple tables
        const createSimpleTable = (items) => {
            const width = doc.page.width - 100;
            const rowHeight = 22; // Standardize row height

            items.forEach((item, index) => {
                // Draw light gray background for alternating rows
                if (index % 2 === 1) {
                    doc.rect(50, doc.y, width, rowHeight).fill('#f5f5f5');
                }

                // Position text in a consistent manner
                const yPos = doc.y + 6; // Consistent y position within row

                doc.fillColor('black');
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(item.label, 60, yPos, { width: 200 });

                doc.font('Helvetica-Bold')
                    .text(item.value, 260, yPos, { width: width - 210, align: 'right' });

                doc.moveDown(1);
            });
        };

        // Fetch data for the report
        let userDistribution = null;
        let leftoverAllocation = null;

        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new ErrorResponse('User not found', 404);
        }

        // Safely try to query models that might not exist
        try {
            if (prisma.incomeDistribution) {
                userDistribution = await prisma.incomeDistribution.findFirst({
                    where: { userId }
                });
            }
        } catch (err) {
            console.error('Error fetching income distribution (model may not exist):', err);
        }

        try {
            if (prisma.leftoverAllocation) {
                leftoverAllocation = await prisma.leftoverAllocation.findFirst({
                    where: { userId }
                });
            }
        } catch (err) {
            console.error('Error fetching leftover allocation (model may not exist):', err);
        }

        // Fetch data for the report
        const [
            transactions,
            section,
            expenses,
            incomes,
            investments,
            savingGoals,
            allTransactions
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
            // Saving goals - current status
            prisma.savingGoal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            }),
            // All transactions for this period (for detailed transaction list)
            prisma.transaction.findMany({
                where: {
                    userId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Calculate totals
        const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const totalInvestments = investments.reduce((sum, investment) => sum + parseFloat(investment.amount), 0);
        const balance = totalIncome - totalExpenses - totalInvestments;

        // Group expenses by category for later use
        const expensesByCategory = {};
        expenses.forEach(expense => {
            const category = expense.category || 'Uncategorized';
            if (!expensesByCategory[category]) {
                expensesByCategory[category] = 0;
            }
            expensesByCategory[category] += parseFloat(expense.amount);
        });

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

        // CURRENT ACCOUNT BALANCES
        // Add a page break if we're getting low on space
        if (doc.y > doc.page.height - 200) {
            doc.addPage();
        }

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('CURRENT ACCOUNT BALANCES', { align: 'left' })
            .moveDown(0.5);

        createSimpleTable([
            { label: 'Savings Balance', value: formatCurrency(section?.savings || 0) },
            { label: 'Expenses Balance', value: formatCurrency(section?.expenses || 0) },
            { label: 'Investments Balance', value: formatCurrency(section?.investments || 0) },
            { label: 'Total Assets', value: formatCurrency((section?.savings || 0) + (section?.expenses || 0) + (section?.investments || 0)) }
        ]);

        doc.moveDown(1);

        // INCOME DISTRIBUTION SETTINGS
        if (userDistribution) {
            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('INCOME DISTRIBUTION SETTINGS', { align: 'left' })
                .moveDown(0.5);

            createSimpleTable([
                { label: 'Savings Allocation', value: `${userDistribution.savingsPercentage || 0}%` },
                { label: 'Expenses Allocation', value: `${userDistribution.expensesPercentage || 0}%` },
                { label: 'Investments Allocation', value: `${userDistribution.investmentsPercentage || 0}%` }
            ]);

            if (leftoverAllocation) {
                doc.moveDown(0.5);
                doc.font('Helvetica')
                    .fontSize(10)
                    .text(`Leftover funds are allocated to: ${leftoverAllocation.section || 'Not specified'}`);
            }

            doc.moveDown(1);
        }

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

            // Convert to array for table display
            const incomeData = Object.entries(incomesBySource)
                .sort((a, b) => b[1] - a[1])
                .map(([source, amount]) => {
                    const percent = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0.0';
                    return [source, formatCurrency(amount), `${percent}%`];
                });

            // Display sources as a standardized table
            createDataTable(
                ['Source', 'Amount', '% of Total'],
                incomeData,
                doc.y,
                {
                    columnWidths: [200, 100, 100]
                }
            );

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

            // Convert to array for table display
            const expenseData = Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                    const percent = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0';
                    return [category, formatCurrency(amount), `${percent}%`];
                });

            // Display categories as a standardized table
            createDataTable(
                ['Category', 'Amount', '% of Total'],
                expenseData,
                doc.y,
                {
                    columnWidths: [200, 100, 100]
                }
            );

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

            // Convert to array for table display
            const investmentData = Object.entries(investmentsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, amount]) => {
                    const percent = totalInvestments > 0 ? ((amount / totalInvestments) * 100).toFixed(1) : '0.0';
                    return [type, formatCurrency(amount), `${percent}%`];
                });

            // Display types as a standardized table
            createDataTable(
                ['Type', 'Amount', '% of Total'],
                investmentData,
                doc.y,
                {
                    columnWidths: [200, 100, 100]
                }
            );

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

            // Convert to array for table display
            const goalsData = savingGoals.map(goal => {
                const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
                return [
                    goal.name,
                    formatCurrency(goal.targetAmount),
                    formatCurrency(goal.currentAmount),
                    `${progress}%`
                ];
            });

            // Display goals as a standardized table
            createDataTable(
                ['Goal', 'Target', 'Current', 'Progress'],
                goalsData,
                doc.y,
                {
                    columnWidths: [150, 80, 80, 70]
                }
            );

            doc.moveDown(1);
        }

        // TRANSACTIONS DETAIL
        if (allTransactions.length > 0) {
            // Add a page break for the transaction details
            doc.addPage();

            doc.font('Helvetica-Bold')
                .fontSize(14)
                .text('DETAILED TRANSACTION LIST', { align: 'center' })
                .moveDown(1);

            doc.fontSize(10)
                .text(`The following is a detailed list of all transactions for the period ${formattedStartDate} to ${formattedEndDate}.`)
                .moveDown(1);

            // Convert transactions to array format for the table
            const transactionData = allTransactions.map(transaction => {
                // Format transaction date
                const txDate = moment(transaction.createdAt).format('MM/DD/YYYY');

                // Determine transaction type and from/to
                let txType = 'Transfer';
                let fromSection = transaction.fromSection || 'External';
                let toSection = transaction.toSection || 'External';

                if (!transaction.fromSection && transaction.toSection) {
                    txType = 'Income';
                } else if (transaction.fromSection && !transaction.toSection) {
                    txType = 'Expense';
                }

                return [
                    txDate,
                    txType,
                    fromSection,
                    toSection,
                    formatCurrency(transaction.amount),
                    transaction.description || 'N/A'
                ];
            });

            // Display transactions in a standardized table
            createDataTable(
                ['Date', 'Type', 'From', 'To', 'Amount', 'Description'],
                transactionData,
                doc.y,
                {
                    columnWidths: [70, 70, 80, 80, 70, 120]
                }
            );

            doc.moveDown(1);
        }

        // CONCLUSION
        // Add a page break if we're getting low on space
        if (doc.y > doc.page.height - 200) {
            doc.addPage();
        }

        // First reset text position and margins to ensure consistent placement
        doc.x = 50;

        // Create full-width centered title
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .text('FINANCIAL INSIGHTS & RECOMMENDATIONS', {
                align: 'center',
                width: doc.page.width - 100  // Full page width minus margins
            })
            .moveDown(0.5);

        // Calculate some financial metrics
        const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
        const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
        const investmentRatio = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;
        const hasSavingGoals = savingGoals.length > 0;
        const hasInvestments = investments.length > 0;
        const highestExpenseCategory = Object.entries(expensesByCategory || {})
            .sort((a, b) => b[1] - a[1])
            .shift();

        // Set page width and margins for centered content
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 150; // 75px margin on each side
        const startX = 75;

        // Income & Expense Analysis section - centered heading with proper width
        doc.x = 50; // Reset x position
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('Income & Expense Analysis:', {
                align: 'center',
                width: doc.page.width - 100
            })
            .moveDown(0.5);

        doc.font('Helvetica')
            .fontSize(10);

        // Create a function for consistent bullet points 
        const addCenteredBulletPoint = (text) => {
            // Calculate the center of the page
            const center = doc.page.width / 2;
            // Width for text content
            const textWidth = 400;
            // Start position for text (center - half the text width + bullet indent)
            const startX = center - (textWidth / 2) + 15;

            // Reset x position and add bullet
            doc.x = center - (textWidth / 2);
            doc.text('•', { continued: false });

            // Position for the text after bullet
            doc.x = startX;
            doc.y = doc.y - 12; // Move back up to the bullet line
            doc.text(text, { width: textWidth - 20 });

            doc.moveDown(0.5);
        };

        // Income vs Expenses insights
        if (balance < 0) {
            addCenteredBulletPoint(`Your expenses (${formatCurrency(totalExpenses)}) exceeded your income (${formatCurrency(totalIncome)}) by ${formatCurrency(Math.abs(balance))}.`);
            addCenteredBulletPoint('Consider creating a stricter budget or finding additional sources of income.');
        } else {
            addCenteredBulletPoint(`You saved ${savingsRate.toFixed(1)}% of your income during this period.`);

            if (savingsRate < 20) {
                addCenteredBulletPoint('This is below the recommended 20% savings rate. Consider reducing discretionary expenses.');
            } else {
                addCenteredBulletPoint('This is a healthy savings rate. Keep up the good work!');
            }
        }

        // Add expense insights if we have expenses
        if (highestExpenseCategory) {
            const [category, amount] = highestExpenseCategory;
            const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;
            addCenteredBulletPoint(`Your highest expense category was "${category}" at ${formatCurrency(amount)} (${percentage}% of total expenses).`);

            if (percentage > 50) {
                addCenteredBulletPoint('This category represents over half of your expenses. Consider if this allocation aligns with your financial priorities.');
            }
        }

        doc.moveDown(0.5);
        doc.x = 50; // Reset x position
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('Savings & Investment Strategy:', {
                align: 'center',
                width: doc.page.width - 100
            })
            .moveDown(0.5);

        doc.font('Helvetica')
            .fontSize(10);

        // Savings allocation insights
        if (section && section.savings > 0) {
            addCenteredBulletPoint(`You currently have ${formatCurrency(section.savings)} in your savings.`);
        } else {
            addCenteredBulletPoint('You have no savings balance. Building an emergency fund should be a priority.');
        }

        // Investment insights
        if (hasInvestments) {
            addCenteredBulletPoint(`You invested ${formatCurrency(totalInvestments)} (${investmentRatio.toFixed(1)}% of income) during this period.`);
        } else {
            addCenteredBulletPoint('You have no investments in this period. Consider allocating funds for long-term growth.');
        }

        // Saving goals insights
        if (hasSavingGoals) {
            const totalGoalAmount = savingGoals.reduce((sum, goal) => sum + parseFloat(goal.targetAmount), 0);
            const totalCurrentAmount = savingGoals.reduce((sum, goal) => sum + parseFloat(goal.currentAmount), 0);
            const overallProgress = ((totalCurrentAmount / totalGoalAmount) * 100).toFixed(1);

            addCenteredBulletPoint(`You're making progress on ${savingGoals.length} saving goals (${overallProgress}% overall completion).`);
        } else {
            addCenteredBulletPoint('You have no saving goals set up. Setting specific financial goals can help motivate saving behavior.');
        }

        doc.moveDown(0.5);
        doc.x = 50; // Reset x position
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('Recommended Actions:', {
                align: 'center',
                width: doc.page.width - 100
            })
            .moveDown(0.5);

        doc.font('Helvetica')
            .fontSize(10);

        // Personalized recommendations based on the data
        const recommendations = [];

        if (balance < 0) {
            recommendations.push('Review your budget and identify areas to reduce spending.');
            recommendations.push('Consider temporary spending freezes on non-essential categories.');
        }

        if (section && section.savings < totalExpenses) {
            recommendations.push('Build your emergency fund to cover at least 3-6 months of expenses.');
        }

        if (!hasInvestments && totalIncome > totalExpenses) {
            recommendations.push('Start investing even small amounts regularly for long-term growth.');
        }

        if (expenseRatio > 70) {
            recommendations.push('Your expenses are consuming over 70% of your income. Look for ways to reduce this percentage.');
        }

        // Default recommendations if we don't have many personalized ones
        if (recommendations.length < 3) {
            if (!recommendations.includes('Review your budget and identify areas to reduce spending.')) {
                recommendations.push('Regularly review your budget and adjust as needed.');
            }
            if (recommendations.length < 3) {
                recommendations.push('Consider automating your savings to maintain consistency.');
            }
            if (recommendations.length < 3) {
                recommendations.push('Diversify your investments to manage risk.');
            }
        }

        // Add the recommendations
        recommendations.forEach(recommendation => {
            addCenteredBulletPoint(recommendation);
        });

        // Draw a box around the insights section
        const insightsEndY = doc.y + 10;
        const boxHeight = insightsEndY - doc.y;


        // Add footer
        doc.moveDown(2);
        doc.fontSize(8)
            .text(`This report was generated on ${moment().format('MMMM DD, YYYY [at] h:mm A')}. `, {
                align: 'center'
            });
        doc.fontSize(8)
            .text('This report is for informational purposes only and does not constitute financial advice.', {
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

            stream.on('error', (err) => {
                console.error('Error writing PDF stream:', err);
                reject(err);
            });
        });

    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}; 