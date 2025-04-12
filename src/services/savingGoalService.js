import * as savingGoalRepository from '../repositories/savingGoalRepository.js';
import * as sectionRepository from '../repositories/sectionRepository.js';
import * as transactionService from '../services/transactionService.js';
import ErrorResponse from '../utils/errorResponse.js';
import { TRANSACTION_TYPES } from '../dtos/transactionDto.js';

export const getSavingGoals = async (userId, page, limit) => {
    return await savingGoalRepository.getSavingGoalsByUserId(userId, page, limit);
};

export const getSavingGoal = async (id, userId) => {
    const goal = await savingGoalRepository.getSavingGoalById(id, userId);
    if (!goal) {
        throw new ErrorResponse('Savings goal not found', 404);
    }
    return goal;
};

export const createSavingGoal = async (userId, goalData) => {
    // Validate transfer type if provided
    if (goalData.transferType && !['EXPENSE', 'INVESTMENT'].includes(goalData.transferType)) {
        throw new ErrorResponse('Invalid transfer type. Must be EXPENSE or INVESTMENT', 400);
    }

    // Format target date
    if (goalData.targetDate) {
        try {
            // For simple date strings like "2025-12-31"
            if (typeof goalData.targetDate === 'string' && goalData.targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                goalData.targetDate = new Date(`${goalData.targetDate}T00:00:00.000Z`);
            } else {
                goalData.targetDate = new Date(goalData.targetDate);
            }

            // Check if date is valid
            if (isNaN(goalData.targetDate.getTime())) {
                throw new ErrorResponse(`Invalid date: ${goalData.targetDate}`, 400);
            }

            // Convert to ISO string
            goalData.targetDate = goalData.targetDate.toISOString();
        } catch (error) {
            if (error instanceof ErrorResponse) {
                throw error;
            }
            throw new ErrorResponse(`Invalid date format: ${error.message}`, 400);
        }
    } else {
        goalData.targetDate = new Date().toISOString();
    }

    // Set initial values
    goalData.currentAmount = goalData.currentAmount || 0;
    goalData.isCompleted = false;

    // Create and return the goal
    return await savingGoalRepository.createSavingGoal(userId, goalData);
};

export const updateSavingGoal = async (id, userId, goalData) => {
    // Validate transfer type if provided
    if (goalData.transferType && !['EXPENSE', 'INVESTMENT'].includes(goalData.transferType)) {
        throw new ErrorResponse('Invalid transfer type. Must be EXPENSE or INVESTMENT', 400);
    }

    // Format target date if provided
    if (goalData.targetDate) {
        try {
            if (typeof goalData.targetDate === 'string' && goalData.targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                goalData.targetDate = new Date(`${goalData.targetDate}T00:00:00.000Z`);
            } else {
                goalData.targetDate = new Date(goalData.targetDate);
            }

            // Check if date is valid
            if (isNaN(goalData.targetDate.getTime())) {
                throw new ErrorResponse(`Invalid date: ${goalData.targetDate}`, 400);
            }

            // Convert to ISO string
            goalData.targetDate = goalData.targetDate.toISOString();
        } catch (error) {
            if (error instanceof ErrorResponse) {
                throw error;
            }
            throw new ErrorResponse(`Invalid date format: ${error.message}`, 400);
        }
    }

    const goal = await savingGoalRepository.getSavingGoalById(id, userId);
    if (!goal) {
        throw new ErrorResponse('Savings goal not found', 404);
    }

    return await savingGoalRepository.updateSavingGoal(id, userId, goalData);
};

export const deleteSavingGoal = async (id, userId) => {
    const goal = await savingGoalRepository.getSavingGoalById(id, userId);
    if (!goal) {
        throw new ErrorResponse('Savings goal not found', 404);
    }

    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // If goal is not completed, return funds to savings section
    if (!goal.isCompleted) {
        // Create transaction record
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.GOAL_TRANSFER,
            fromSection: null,
            toSection: 'savings',
            amount: goal.currentAmount,
            description: `Canceled savings goal: ${goal.name}`
        });
        const deletedGoal = await savingGoalRepository.deleteSavingGoal(id, userId);
        return {
            message: 'Savings goal deleted successfully',
            data: deletedGoal
        };
    } else {
        // If goal is completed, just delete it as funds are already in their respective sections
        const deletedGoal = await savingGoalRepository.deleteSavingGoal(id, userId);
        return {
            message: 'Completed savings goal deleted successfully',
            data: deletedGoal
        };
    }
};

export const contributeFunds = async (id, userId, amount) => {
    const goal = await savingGoalRepository.getSavingGoalById(id, userId);
    if (!goal) {
        throw new ErrorResponse('Savings goal not found', 404);
    }

    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Check if there are enough funds in savings section
    if (section.savings < amount) {
        throw new ErrorResponse('Insufficient funds in savings section', 400);
    }

    // Calculate how much more is needed to reach the target
    const remainingToTarget = goal.targetAmount - goal.currentAmount;

    // If the contribution would exceed the target amount
    if (amount > remainingToTarget) {
        const actualContribution = remainingToTarget;
        const excessAmount = amount - remainingToTarget;

        // Update goal to completed status
        const updatedGoal = await savingGoalRepository.updateSavingGoal(id, userId, {
            currentAmount: goal.targetAmount,
            isCompleted: true
        });

        // Determine which section to transfer to based on goal type
        const targetSection = goal.transferType === 'INVESTMENT' ? 'investments' : 'expenses';

        // Build purpose description for notifications
        const purposeInfo = goal.purpose ? ` for ${goal.purpose}` : '';
        const itemInfo = goal.targetItem ? ` (${goal.targetItem})` : '';

        // Create transactions sequentially to ensure proper section updates
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.GOAL_TRANSFER,
            fromSection: 'savings',
            toSection: null,
            amount: actualContribution,
            description: `Final contribution to savings goal: ${goal.name}`
        });

        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.GOAL_TRANSFER,
            fromSection: null,
            toSection: targetSection,
            amount: goal.targetAmount,
            description: `Completed goal: ${goal.name} - ${goal.category}${purposeInfo}${itemInfo} - Ready for ${targetSection === 'investments' ? 'investment' : 'purchase'}`
        });

        return {
            ...updatedGoal,
            message: `Goal completed! Amount of ${goal.targetAmount} transferred to ${targetSection}${purposeInfo}${itemInfo}. ${excessAmount > 0 ? `Excess amount of ${excessAmount} returned to savings.` : ''} Remember to make the ${targetSection === 'investments' ? 'investment' : 'purchase'} when you're ready.`
        };
    }

    // Normal contribution that doesn't complete the goal
    const updatedGoal = await savingGoalRepository.updateSavingGoal(id, userId, {
        currentAmount: goal.currentAmount + amount,
        isCompleted: goal.currentAmount + amount >= goal.targetAmount
    });

    // If this contribution completes the goal
    if (updatedGoal.isCompleted) {
        // Determine which section to transfer to based on goal type
        const targetSection = goal.transferType === 'INVESTMENT' ? 'investments' : 'expenses';

        // Build purpose description for notifications
        const purposeInfo = goal.purpose ? ` for ${goal.purpose}` : '';
        const itemInfo = goal.targetItem ? ` (${goal.targetItem})` : '';

        // Create a transaction record for goal completion
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.GOAL_TRANSFER,
            fromSection: null,
            toSection: targetSection,
            amount: updatedGoal.targetAmount,
            description: `Completed goal: ${goal.name} - ${goal.category}${purposeInfo}${itemInfo} - Ready for ${targetSection === 'investments' ? 'investment' : 'purchase'}`
        });

        // Return goal with notification
        return {
            ...updatedGoal,
            message: `Goal completed! Amount of ${updatedGoal.targetAmount} transferred to ${targetSection}${purposeInfo}${itemInfo}. Remember to make the ${targetSection === 'investments' ? 'investment' : 'purchase'} when you're ready.`
        };
    }

    // Create transaction record for the contribution
    await transactionService.createTransaction(userId, {
        type: TRANSACTION_TYPES.GOAL_TRANSFER,
        fromSection: 'savings',
        toSection: null,
        amount,
        description: `Contribution to savings goal: ${goal.name}`
    });

    return updatedGoal;
};

export const transferFromGoalToSavings = async (id, userId, amount) => {
    const goal = await savingGoalRepository.getSavingGoalById(id, userId);
    if (!goal) {
        throw new ErrorResponse('Savings goal not found', 404);
    }

    // Check if there are enough funds in the goal
    if (goal.currentAmount < amount) {
        throw new ErrorResponse('Insufficient funds in savings goal', 400);
    }

    const section = await sectionRepository.getSectionByUserId(userId);
    if (!section) {
        throw new ErrorResponse('Section not found', 404);
    }

    // Deduct from goal
    await savingGoalRepository.updateSavingGoal(id, userId, {
        currentAmount: goal.currentAmount - amount
    }),

        // Create transaction record
        await transactionService.createTransaction(userId, {
            type: TRANSACTION_TYPES.GOAL_TRANSFER,
            fromSection: null,
            toSection: 'savings',
            amount,
            description: `Transfer from savings goal: ${goal.name}`
        });

    return {
        message: `Successfully transferred ${amount} from savings goal to section savings`,
        goal: await savingGoalRepository.getSavingGoalById(id, userId)
    };
};