import * as incomeService from '../services/incomeService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateIncomeDto } from '../dtos/incomeDto.js';

export const addIncome = asyncHandler(async (req, res, next) => {
    try {
        // Create and validate DTO
        const incomeData = new CreateIncomeDto(req.body);
        incomeData.validate();

        const income = await incomeService.addIncome(
            req.user.id,
            incomeData.amount,
            incomeData.description,
            incomeData.type || 'regular',
            incomeData.type === 'investment_return' ? incomeData.investmentId : null
        );

        res.status(201).json({
            status: 'success',
            data: income
        });
    } catch (error) {
        next(error);
    }
});

export const getAvailableIncome = asyncHandler(async (req, res) => {
    const availableIncome = await incomeService.getAvailableIncome(req.user.id);

    res.status(200).json({
        status: 'success',
        data: availableIncome
    });
}); 