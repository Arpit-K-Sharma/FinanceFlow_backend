import { getSectionByUserId as getSection, updateSection as update } from '../repositories/sectionRepository.js';
import { getUserById, updateUser, updateSavingsBalance } from '../repositories/userRepository.js';
import { createTransaction } from '../repositories/transactionRepository.js';
import ErrorResponse from '../utils/errorResponse.js';
import * as incomeService from './incomeService.js';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

export const getSectionByUserId = async (userId) => {
    const section = await getSection(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    return section;
};

export const updateSection = async (userId, updateData, description) => {
    const section = await getSection(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Create a transaction only if it's a manual adjustment, not from distribution
    // We'll check the description to determine if it's a distribution
    const isDistributionUpdate = description &&
        (description.includes('Distribution') || description === 'income distribution');

    // Only create transactions if it's not from a distribution
    if (!isDistributionUpdate) {
        const transactionPromises = [];

        if (updateData.savings !== undefined && updateData.savings !== section.savings) {
            const amount = Math.abs(updateData.savings - section.savings);
            const fromSection = updateData.savings > section.savings ? null : 'savings';
            const toSection = updateData.savings > section.savings ? 'savings' : null;

            transactionPromises.push(
                createTransaction(userId, {
                    type: TRANSACTION_TYPES.MANUAL,
                    fromSection,
                    toSection,
                    amount,
                    description: description || 'Manual section adjustment'
                })
            );

            // Update user's savings balance
            await updateUser(userId, {
                savingsBalance: updateData.savings
            });
        }

        if (updateData.expenses !== undefined && updateData.expenses !== section.expenses) {
            const amount = Math.abs(updateData.expenses - section.expenses);
            const fromSection = updateData.expenses > section.expenses ? null : 'expenses';
            const toSection = updateData.expenses > section.expenses ? 'expenses' : null;

            transactionPromises.push(
                createTransaction(userId, {
                    type: TRANSACTION_TYPES.MANUAL,
                    fromSection,
                    toSection,
                    amount,
                    description: description || 'Manual section adjustment'
                })
            );
        }

        if (updateData.investments !== undefined && updateData.investments !== section.investments) {
            const amount = Math.abs(updateData.investments - section.investments);
            const fromSection = updateData.investments > section.investments ? null : 'investments';
            const toSection = updateData.investments > section.investments ? 'investments' : null;

            transactionPromises.push(
                createTransaction(userId, {
                    type: TRANSACTION_TYPES.MANUAL,
                    fromSection,
                    toSection,
                    amount,
                    description: description || 'Manual section adjustment'
                })
            );
        }

        // Execute all transaction creations in parallel
        if (transactionPromises.length > 0) {
            await Promise.all(transactionPromises);
        }
    }

    // Update the section
    return await update(userId, updateData);
};


export const distributeMoney = async (userId) => {
    // Get user for percentage allocation
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    const section = await getSection(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Get total available income directly from incomeService
    const availableIncome = await incomeService.getAvailableIncome(userId);

    if (availableIncome <= 0) {
        throw new ErrorResponse('No income available to distribute', 400);
    }

    // Calculate distribution based on percentages
    const savingsAmount = Math.floor((user.savingsPercent || 0) * availableIncome / 100);
    const expensesAmount = Math.floor((user.expensesPercent || 0) * availableIncome / 100);
    const investmentsAmount = Math.floor((user.investmentsPercent || 0) * availableIncome / 100);

    // Calculate total allocated and remaining amount
    const totalAllocated = savingsAmount + expensesAmount + investmentsAmount;
    const remainingAmount = availableIncome - totalAllocated;

    // Calculate actual savings including leftover if applicable
    const totalSavingsAmount = savingsAmount + (user.leftoverAction === 'savings' ? remainingAmount : 0);

    // Create transactions for initial distribution
    const transactions = [];

    // First, create a transaction to move money from income to savings
    if (savingsAmount > 0) {
        transactions.push(
            createTransaction(userId, {
                type: TRANSACTION_TYPES.AUTOMATIC,
                fromSection: 'income',
                toSection: 'savings',
                amount: savingsAmount,
                description: 'Distribution from income to savings'
            })
        );
    }

    // Move money from income to expenses
    if (expensesAmount > 0) {
        transactions.push(
            createTransaction(userId, {
                type: TRANSACTION_TYPES.AUTOMATIC,
                fromSection: 'income',
                toSection: 'expenses',
                amount: expensesAmount,
                description: 'Distribution from income to expenses'
            })
        );
    }

    // Move money from income to investments
    if (investmentsAmount > 0) {
        transactions.push(
            createTransaction(userId, {
                type: TRANSACTION_TYPES.AUTOMATIC,
                fromSection: 'income',
                toSection: 'investments',
                amount: investmentsAmount,
                description: 'Distribution from income to investments'
            })
        );
    }

    // Handle remaining amount based on user preference
    if (remainingAmount > 0) {
        const leftoverSection = user.leftoverAction || 'savings';
        transactions.push(
            createTransaction(userId, {
                type: TRANSACTION_TYPES.LEFTOVER,
                fromSection: 'income',
                toSection: leftoverSection,
                amount: remainingAmount,
                description: `Distribution of remaining amount to ${leftoverSection}`
            })
        );
    }

    // Execute all transactions
    await Promise.all(transactions);

    // Update section with new amounts, providing a specific description
    await updateSection(userId, {
        savings: section.savings + savingsAmount + (user.leftoverAction === 'savings' ? remainingAmount : 0),
        expenses: section.expenses + expensesAmount + (user.leftoverAction === 'expenses' ? remainingAmount : 0),
        investments: section.investments + investmentsAmount + (user.leftoverAction === 'investments' ? remainingAmount : 0)
    }, 'income distribution');

    // Update the user's savings balance
    if (totalSavingsAmount > 0) {
        const newSavingsBalance = user.savingsBalance + totalSavingsAmount;
        await updateSavingsBalance(userId, newSavingsBalance);
    }

    // Deduct the distributed amount from available income using incomeService
    await incomeService.deductFromAvailableIncome(userId, availableIncome);

    // Return updated section
    return await getSection(userId);
};
