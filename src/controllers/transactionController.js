import * as transactionService from '../services/transactionService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateTransactionDto } from '../dtos/transactionDto.js';

export const getTransactions = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type || 'all';
        const transactions = await transactionService.getTransactions(req.user.id, page, limit, type);
        res.json(transactions);
    } catch (error) {
        next(error);
    }
});

export const getTransaction = asyncHandler(async (req, res, next) => {
    try {
        const transaction = await transactionService.getTransaction(req.params.id, req.user.id);
        res.json(transaction);
    } catch (error) {
        next(error);
    }
});

export const createTransaction = asyncHandler(async (req, res, next) => {
    try {
        const transactionData = new CreateTransactionDto(req.body);
        transactionData.validate();
        const transaction = await transactionService.createTransaction(req.user.id, transactionData);
        res.status(201).json(transaction);
    } catch (error) {
        next(error);
    }
});

export const updateTransaction = asyncHandler(async (req, res, next) => {
    try {
        const { description } = req.body;
        if (!description) {
            throw new ErrorResponse('Description is required', 400);
        }
        const transaction = await transactionService.updateTransactionDescription(req.params.id, req.user.id, description);
        res.json(transaction);
    } catch (error) {
        next(error);
    }
});

// New controller to handle direct transfers from income to any section
export const transferIncomeToSection = asyncHandler(async (req, res, next) => {
    const { amount, toSection, description } = req.body;

    try {
        const result = await transactionService.transferFromIncomeToSection(
            req.user.id,
            amount,
            toSection,
            description
        );

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});