import * as investmentRepository from '../repositories/investmentRepository.js';
import * as sectionRepository from '../repositories/sectionRepository.js';
import * as transactionService from '../services/transactionService.js';
import ErrorResponse from '../utils/errorResponse.js';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

export const getInvestments = async (userId, page, limit) => {
    return await investmentRepository.getInvestmentsByUserId(userId, page, limit);
};

export const getInvestment = async (id, userId) => {
    const investment = await investmentRepository.getInvestmentById(id, userId);
    if (!investment) {
        throw new ErrorResponse('Investment not found', 404);
    }
    return investment;
};

export const createInvestment = async (userId, investmentData) => {
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Check if there are enough funds in investments section
    if (section.investments < investmentData.amount) {
        throw new ErrorResponse('Insufficient funds in investments section', 400);
    }

    // Create investment and update section in parallel
    const [investment, updatedSection] = await Promise.all([
        investmentRepository.createInvestment(userId, investmentData),
    ]);

    // Create transaction record
    await transactionService.createTransaction(userId, {
        type: TRANSACTION_TYPES.MANUAL,
        fromSection: 'investments',
        amount: investmentData.amount,
        description: `Investment in ${investmentData.assestName}`
    });

    return investment;
};

export const updateInvestment = async (id, userId, investmentData) => {
    // Get the original investment
    const originalInvestment = await investmentRepository.getInvestmentById(id, userId);
    if (!originalInvestment) {
        throw new ErrorResponse('Investment not found', 404);
    }

    // Get user's section
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // If amount is being updated, handle the full amount change
    if (investmentData.amount !== undefined && investmentData.amount !== originalInvestment.amount) {
        // First, return the original amount to the investments section
        await sectionRepository.updateSection(userId, {
            investments: section.investments + originalInvestment.amount
        });

        // Check if there are enough funds for the new amount
        if (section.investments + originalInvestment.amount < investmentData.amount) {
            throw new ErrorResponse('Insufficient funds in investments section', 400);
        }

        // Create transaction record for the new investment amount
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.MANUAL,
            fromSection: 'investments',
            amount: investmentData.amount,
            description: `Adjusted investment in ${investmentData.assetName || originalInvestment.assetName || 'No name'}`
        });
    }

    // Update and return the investment
    return await investmentRepository.updateInvestment(id, userId, investmentData);
};

export const deleteInvestment = async (id, userId) => {
    // Get the investment to delete
    const investment = await investmentRepository.getInvestmentById(id, userId);
    if (!investment) {
        throw new ErrorResponse('Investment not found', 404);
    }

    // Get user's section
    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // If we found the original transaction, delete it
    // Otherwise create a return transaction
    if (investment.isClosed) {
        await investmentRepository.deleteInvestment(id, userId);
    } else {
        // Create return transaction as fallback if original transaction not found
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.REFUND,
            toSection: 'investments',
            amount: investment.amount,
            description: `Investment reverted from ${investment.assetName}`
        });
        await investmentRepository.deleteInvestment(id, userId);
    }

    // Prepare the response based on whether the investment is closed or not
    const response = {
        message: 'Investment deleted successfully',
        transactionHandled: investment.isClosed ? 'deleted' : 'created_return'
    };

    // Only include the refunded amount if the investment is not closed
    if (!investment.isClosed) {
        response.refunded = investment.amount;
    }

    return response;
};

export const closeInvestment = async (investmentId, userId, returnAmount) => {
    // Mark the investment as closed and update the total return
    await investmentRepository.updateInvestment(investmentId, userId, {
        isClosed: true,
        totalReturn: returnAmount
    });
};