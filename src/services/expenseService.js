import * as expenseRepository from '../repositories/expenseRepository.js';
import * as sectionRepository from '../repositories/sectionRepository.js';
import * as transactionService from '../services/transactionService.js';
import ErrorResponse from '../utils/errorResponse.js';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

export const getExpenses = async (userId, page, limit) => {
    return await expenseRepository.getExpensesByUserId(userId, page, limit);
};

export const getExpense = async (id, userId) => {
    const expense = await expenseRepository.getExpenseById(id, userId);
    if (!expense) {
        throw new ErrorResponse('Expense not found', 404);
    }
    return expense;
};

export const createExpense = async (userId, expenseData) => {
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Check if there are enough funds in expenses section
    if (section.expenses < expenseData.amount) {
        throw new ErrorResponse('Insufficient funds in expenses section', 400);
    }

    // Create expense and update section in parallel
    const [expense, updatedSection] = await Promise.all([
        expenseRepository.createExpense(userId, expenseData),
        sectionRepository.updateSection(userId, {
            expenses: section.expenses - expenseData.amount
        })
    ]);

    // Create transaction record
    await transactionService.createTransaction(userId, {
        type: TRANSACTION_TYPES.MANUAL,
        fromSection: 'expenses',
        amount: expenseData.amount,
        description: `Expense: ${expenseData.description}`
    });

    return expense;
};

export const updateExpense = async (id, userId, expenseData) => {
    // Get the original expense
    const originalExpense = await expenseRepository.getExpenseById(id, userId);
    if (!originalExpense) {
        throw new ErrorResponse('Expense not found', 404);
    }

    // Get user's section
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // If amount is being updated, adjust section balance and create transaction
    if (expenseData.amount !== undefined && expenseData.amount !== originalExpense.amount) {

        // Update section balance
        await sectionRepository.updateSection(userId, {
            expenses: section.expenses + originalExpense.amount
        });

        if (section.expenses + originalExpense.amount < expenseData.amount) {
            throw new ErrorResponse('Insufficient funds in expense section', 400);
        }

        // Create transaction record for the adjustment
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.MANUAL,
            fromSection: 'expenses',
            amount: expenseData.amount,
            description: `Expense adjustment: ${originalExpense.description || 'No description'}`
        });
    }

    // Update and return the expense
    return await expenseRepository.updateExpense(id, userId, expenseData);
};

export const deleteExpense = async (id, userId) => {
    // Get the expense to delete
    const expense = await expenseRepository.getExpenseById(id, userId);
    if (!expense) {
        throw new ErrorResponse('Expense not found', 404);
    }

    // Get user's section
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }



    // Create refund transaction as fallback if original transaction not found
    await transactionService.createTransaction(userId, {
        type: TRANSACTION_TYPES.REFUND,
        toSection: 'expenses',
        amount: expense.amount,
        description: `Refund: ${expense.description}`
    });

    await expenseRepository.deleteExpense(id, userId);


    return {
        message: 'Expense deleted successfully',
        refunded: expense.amount,
        transactionHandled: 'created_refund'
    };
}; 