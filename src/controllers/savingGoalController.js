import * as userRepository from '../repositories/userRepository.js';
import * as savingGoalService from '../services/savingGoalService.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
    CreateSavingGoalDto,
    UpdateSavingGoalDto,
    ContributeToGoalDto,
    TransferFromGoalDto
} from '../dtos/savingGoalDto.js';

// @desc    Create a new saving goal
// @route   POST /api/saving-goals
// @access  Private
export const createSavingGoal = asyncHandler(async (req, res, next) => {
    try {
        const goalData = new CreateSavingGoalDto(req.body);
        goalData.validate();
        const goal = await savingGoalService.createSavingGoal(req.user.id, goalData);
        res.status(201).json(goal);
    } catch (error) {
        next(error);
    }
});

// @desc    Get all user's saving goals
// @route   GET /api/saving-goals
// @access  Private
export const getSavingGoals = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const savingGoals = await savingGoalService.getSavingGoals(req.user.id, page, limit);
        res.json(savingGoals);
    } catch (error) {
        next(error);
    }
});

// @desc    Get a single saving goal
// @route   GET /api/saving-goals/:id
// @access  Private
export const getSavingGoal = asyncHandler(async (req, res, next) => {
    try {
        const goal = await savingGoalService.getSavingGoal(req.params.id, req.user.id);
        res.json(goal);
    } catch (error) {
        next(error);
    }
});

// @desc    Update a saving goal
// @route   PUT /api/saving-goals/:id
// @access  Private
export const updateSavingGoal = asyncHandler(async (req, res, next) => {
    try {
        const goalData = new UpdateSavingGoalDto(req.body);
        goalData.validate();
        const goal = await savingGoalService.updateSavingGoal(req.params.id, req.user.id, goalData);
        res.json(goal);
    } catch (error) {
        next(error);
    }
});

// @desc    Delete a saving goal
// @route   DELETE /api/saving-goals/:id
// @access  Private
export const deleteSavingGoal = asyncHandler(async (req, res, next) => {
    try {
        const result = await savingGoalService.deleteSavingGoal(req.params.id, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// @desc    Contribute funds to a saving goal
// @route   POST /api/saving-goals/:id/contribute
// @access  Private
export const contributeFunds = asyncHandler(async (req, res, next) => {
    try {
        const contributionData = new ContributeToGoalDto(req.body);
        contributionData.validate();
        const result = await savingGoalService.contributeFunds(
            req.params.id,
            req.user.id,
            contributionData.amount
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export const transferFromGoalToSavings = asyncHandler(async (req, res, next) => {
    try {
        const transferData = new TransferFromGoalDto(req.body);
        transferData.validate();
        const result = await savingGoalService.transferFromGoalToSavings(
            req.params.id,
            req.user.id,
            transferData.amount
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
}); 