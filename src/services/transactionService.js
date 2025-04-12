import * as transactionRepository from '../repositories/transactionRepository.js';
import * as sectionRepository from '../repositories/sectionRepository.js';
import ErrorResponse from '../utils/errorResponse.js';
import * as incomeService from '../services/incomeService.js';
import { PrismaClient } from '@prisma/client';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

const prisma = new PrismaClient();

export const getTransactions = async (userId, page, limit, type) => {
    return await transactionRepository.getTransactionsByUserId(userId, page, limit, type);
};

export const getTransaction = async (id, userId) => {
    const transaction = await transactionRepository.getTransactionById(id, userId);
    if (!transaction) {
        throw new ErrorResponse('Transaction not found', 404);
    }
    return transaction;
};

export const createTransaction = async (userId, transactionData) => {
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Update section amounts based on transaction
    const sectionUpdate = {
        savings: section.savings,
        expenses: section.expenses,
        investments: section.investments
    };

    // For transactions related to saving goals, update the user's savings balance
    let updateUserSavingsBalance = false;
    let savingsBalanceChange = 0;

    if (transactionData.type === 'goal-transfer') {
        // Handle goal transfer transactions
        if (transactionData.fromSection === 'savings') {
            // Deduct from savings section
            sectionUpdate.savings -= transactionData.amount;
        } else if (transactionData.toSection) {
            // Add to target section (investments or expenses)
            sectionUpdate[transactionData.toSection] += transactionData.amount;
        }
    } else {
        // Handle regular transactions
        if (transactionData.fromSection) {
            sectionUpdate[transactionData.fromSection] -= transactionData.amount;
        }
        if (transactionData.toSection) {
            sectionUpdate[transactionData.toSection] += transactionData.amount;
        }

        // Update savings balance for regular transactions
        if (transactionData.fromSection === 'savings') {
            updateUserSavingsBalance = true;
            savingsBalanceChange = -transactionData.amount;
        } else if (transactionData.toSection === 'savings') {
            updateUserSavingsBalance = true;
            savingsBalanceChange = transactionData.amount;
        }
    }

    // Create transaction and update section in parallel
    const promises = [
        transactionRepository.createTransaction(userId, transactionData),
        sectionRepository.updateSection(userId, sectionUpdate)
    ];

    // If we need to update the user's savings balance, add that to the promises
    if (updateUserSavingsBalance) {
        promises.push(
            prisma.user.update({
                where: { id: userId },
                data: {
                    savingsBalance: {
                        increment: savingsBalanceChange
                    }
                }
            })
        );
    }

    const [transaction, updatedSection] = await Promise.all(promises);

    return transaction;
};

export const updateTransactionDescription = async (id, userId, description) => {
    const transaction = await transactionRepository.getTransactionById(id, userId);
    if (!transaction) {
        throw new ErrorResponse('Transaction not found', 404);
    }

    // Only allow updating the description
    const updatedTransaction = await transactionRepository.updateTransaction(id, userId, {
        description
    });

    return updatedTransaction;
};

// New function to handle direct transfers from income to any section
export const transferFromIncomeToSection = async (userId, amount, toSection, description) => {
    // Validate target section
    const validSections = ['savings', 'expenses', 'investments'];
    if (!validSections.includes(toSection)) {
        throw new ErrorResponse('Invalid target section. Must be one of: savings, expenses, investments', 400);
    }

    // Verify user has enough available income
    const availableIncome = await incomeService.getAvailableIncome(userId);
    if (availableIncome < amount) {
        throw new ErrorResponse('Not enough available income', 400);
    }

    // Get current section values
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Deduct from available income
    await incomeService.deductFromAvailableIncome(userId, amount);

    // Update target section
    const sectionUpdate = {
        savings: section.savings,
        expenses: section.expenses,
        investments: section.investments
    };

    sectionUpdate[toSection] += amount;

    // Create transaction and update section in parallel
    const promises = [
        transactionRepository.createTransaction(userId, {
            type: TRANSACTION_TYPES.MANUAL,
            fromSection: 'income',
            toSection: toSection,
            amount,
            description: description || `Direct transfer from income to ${toSection}`
        }),
        sectionRepository.updateSection(userId, sectionUpdate)
    ];

    // If transferring to savings, also update the user's savings balance
    if (toSection === 'savings') {
        promises.push(
            prisma.user.update({
                where: { id: userId },
                data: {
                    savingsBalance: {
                        increment: amount
                    }
                }
            })
        );
    }

    const [transaction, updatedSection] = await Promise.all(promises);

    return {
        transaction,
        updatedSection
    };
};