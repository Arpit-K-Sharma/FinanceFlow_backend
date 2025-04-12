import ErrorResponse from '../utils/errorResponse.js';

class CreateUserDto {
    constructor(data) {
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.savingsPercent = data.savingsPercent || null;
        this.expensesPercent = data.expensesPercent || null;
        this.investmentsPercent = data.investmentsPercent || null;
        this.leftoverAction = data.leftoverAction || null;
    }

    validate() {
        if (!this.name) {
            throw new ErrorResponse('Name is required', 400);
        }

        if (!this.email || !this.password) {
            throw new ErrorResponse('Email and password are required', 400);
        }

        if (this.email && !/\S+@\S+\.\S+/.test(this.email)) {
            throw new ErrorResponse('Invalid email format', 400);
        }

        if (this.savingsPercent !== null && (this.savingsPercent < 0 || this.savingsPercent > 100)) {
            throw new ErrorResponse('Savings percentage must be between 0 and 100', 400);
        }

        if (this.expensesPercent !== null && (this.expensesPercent < 0 || this.expensesPercent > 100)) {
            throw new ErrorResponse('Expenses percentage must be between 0 and 100', 400);
        }

        if (this.investmentsPercent !== null && (this.investmentsPercent < 0 || this.investmentsPercent > 100)) {
            throw new ErrorResponse('Investments percentage must be between 0 and 100', 400);
        }

        // Check if total percentages exceed 100%
        const total =
            (this.savingsPercent || 0) +
            (this.expensesPercent || 0) +
            (this.investmentsPercent || 0);

        if (total > 100) {
            throw new ErrorResponse('Total percentages cannot exceed 100%', 400);
        }

        // Check if leftoverAction is valid
        const validActions = ['savings', 'expenses', 'investments'];
        if (this.leftoverAction && !validActions.includes(this.leftoverAction)) {
            throw new ErrorResponse('Invalid leftover action. Must be one of: savings, expenses, investments', 400);
        }

        return true;
    }
}

class UpdateUserDto {
    constructor(data) {
        this.name = data.name;
        this.email = data.email;
        this.password = data.password;
        this.savingsPercent = data.savingsPercent;
        this.expensesPercent = data.expensesPercent;
        this.investmentsPercent = data.investmentsPercent;
        this.leftoverAction = data.leftoverAction;
    }

    validate() {
        if (this.email && !/\S+@\S+\.\S+/.test(this.email)) {
            throw new ErrorResponse('Invalid email format', 400);
        }

        if (this.savingsPercent !== undefined && (this.savingsPercent < 0 || this.savingsPercent > 100)) {
            throw new ErrorResponse('Savings percentage must be between 0 and 100', 400);
        }

        if (this.expensesPercent !== undefined && (this.expensesPercent < 0 || this.expensesPercent > 100)) {
            throw new ErrorResponse('Expenses percentage must be between 0 and 100', 400);
        }

        if (this.investmentsPercent !== undefined && (this.investmentsPercent < 0 || this.investmentsPercent > 100)) {
            throw new ErrorResponse('Investments percentage must be between 0 and 100', 400);
        }

        // Check if leftoverAction is valid
        const validActions = ['savings', 'expenses', 'investments'];
        if (this.leftoverAction && !validActions.includes(this.leftoverAction)) {
            throw new ErrorResponse('Invalid leftover action. Must be one of: savings, expenses, investments', 400);
        }

        return true;
    }
}

export {
    CreateUserDto,
    UpdateUserDto
};
