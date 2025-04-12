import * as investmentService from '../services/investmentService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateInvestmentDto, UpdateInvestmentDto } from '../dtos/investmentDto.js';

export const getInvestments = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const investments = await investmentService.getInvestments(req.user.id, page, limit);
        res.json(investments);
    } catch (error) {
        next(error);
    }
});

export const getInvestment = asyncHandler(async (req, res, next) => {
    try {
        const investment = await investmentService.getInvestment(req.params.id, req.user.id);
        res.json(investment);
    } catch (error) {
        next(error);
    }
});

export const createInvestment = asyncHandler(async (req, res, next) => {
    try {
        const investmentData = new CreateInvestmentDto(req.body);
        investmentData.validate();
        const investment = await investmentService.createInvestment(req.user.id, investmentData);
        res.status(201).json(investment);
    } catch (error) {
        next(error);
    }
});

export const updateInvestment = asyncHandler(async (req, res, next) => {
    try {
        const investmentData = new UpdateInvestmentDto(req.body);
        investmentData.validate();
        const investment = await investmentService.updateInvestment(req.params.id, req.user.id, investmentData);
        res.json(investment);
    } catch (error) {
        next(error);
    }
});

export const deleteInvestment = asyncHandler(async (req, res, next) => {
    try {
        const result = await investmentService.deleteInvestment(req.params.id, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});
