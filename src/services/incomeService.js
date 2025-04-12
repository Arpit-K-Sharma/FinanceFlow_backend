import { createIncome, getTotalIncome, updateAvailableIncome } from '../repositories/incomeRepository.js';
import { createTransaction } from '../repositories/transactionRepository.js';
import * as investmentRepository from '../repositories/investmentRepository.js';
import { closeInvestment } from './investmentService.js';
import ErrorResponse from '../utils/errorResponse.js';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

export const addIncome = async (userId, amount, description, type = 'regular', investmentId = null) => {
    // Validate amount
    if (!amount || amount <= 0) {
        throw new ErrorResponse('Amount must be greater than 0', 400);
    }

    // Parse amount as float if it's a string
    amount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if this is an investment return and validate the investment
    if (type === 'investment_return') {
        if (!investmentId) {
            throw new ErrorResponse('Investment ID is required for investment returns', 400);
        }

        // Verify the investment exists and belongs to the user
        const investment = await investmentRepository.getInvestmentById(investmentId, userId);
        if (!investment) {
            throw new ErrorResponse('Investment not found', 404);
        }

        // Update the investment with the return amount
        await investmentRepository.updateInvestment(investmentId, userId, {
            totalReturn: amount
        });

        // Close the investment and update the total return
        await closeInvestment(investmentId, userId, amount);

        // Update the description to include investment details if not provided
        if (!description) {
            description = `Return from investment: ${investment.assetName}`;
        }
    }

    // Create income record
    const income = await createIncome(userId, {
        amount,
        type,
        investmentId: type === 'investment_return' ? parseInt(investmentId, 10) : null,
        description: description || `${type === 'regular' ? 'Regular income' : 'Investment return'}`
    });

    // Create transaction record
    await createTransaction(userId, {
        type: TRANSACTION_TYPES.MANUAL,
        toSection: 'income',
        amount,
        description: description || `${type === 'regular' ? 'Regular income' : 'Investment return'}`
    });

    return income;
};

export const getAvailableIncome = async (userId) => {
    return await getTotalIncome(userId);
};

export const deductFromAvailableIncome = async (userId, amount) => {
    const currentIncome = await getTotalIncome(userId);

    if (currentIncome < amount) {
        throw new ErrorResponse('Not enough available income to distribute', 400);
    }

    // Deduct from available income using the new repository function
    return await updateAvailableIncome(userId, -amount);
}; 