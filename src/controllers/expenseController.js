import * as expenseService from '../services/expenseService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateExpenseDto, UpdateExpenseDto } from '../dtos/expenseDto.js';

export const getExpenses = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const expenses = await expenseService.getExpenses(req.user.id, page, limit);
        res.json(expenses);
    } catch (error) {
        next(error);
    }
});

export const getExpense = asyncHandler(async (req, res, next) => {
    try {
        const expense = await expenseService.getExpense(req.params.id, req.user.id);
        res.json(expense);
    } catch (error) {
        next(error);
    }
});

export const createExpense = asyncHandler(async (req, res, next) => {
    try {
        const expenseData = new CreateExpenseDto(req.body);
        expenseData.validate();
        const expense = await expenseService.createExpense(req.user.id, expenseData);
        res.status(201).json(expense);
    } catch (error) {
        next(error);
    }
});

export const updateExpense = asyncHandler(async (req, res, next) => {
    try {
        const expenseData = new UpdateExpenseDto(req.body);
        expenseData.validate();
        const expense = await expenseService.updateExpense(req.params.id, req.user.id, expenseData);
        res.json(expense);
    } catch (error) {
        next(error);
    }
});

export const deleteExpense = asyncHandler(async (req, res, next) => {
    try {
        const result = await expenseService.deleteExpense(req.params.id, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});