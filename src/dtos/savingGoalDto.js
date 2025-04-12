import ErrorResponse from '../utils/errorResponse.js';

class CreateSavingGoalDto {
    constructor(data) {
        this.name = data.name;
        this.targetAmount = data.targetAmount;
        this.category = data.category;
        this.targetDate = data.targetDate;
        this.transferType = data.transferType;
        this.transferId = data.transferId;
        this.purpose = data.purpose;
        this.targetItem = data.targetItem;
    }

    validate() {
        if (!this.name) {
            throw new ErrorResponse('Name is required', 400);
        }

        if (!this.targetAmount || this.targetAmount <= 0) {
            throw new ErrorResponse('Target amount must be greater than 0', 400);
        }

        if (!this.category) {
            throw new ErrorResponse('Category is required', 400);
        }

        if (this.transferType && !['EXPENSE', 'INVESTMENT'].includes(this.transferType)) {
            throw new ErrorResponse('Invalid transfer type. Must be EXPENSE or INVESTMENT', 400);
        }

        return true;
    }
}

class ContributeToGoalDto {
    constructor(data) {
        this.amount = data.amount;
    }

    validate() {
        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }
        return true;
    }
}

class TransferFromGoalDto {
    constructor(data) {
        this.amount = data.amount;
    }

    validate() {
        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }
        return true;
    }
}

class UpdateSavingGoalDto {
    constructor(data) {
        this.name = data.name;
        this.targetAmount = data.targetAmount;
        this.isCompleted = data.isCompleted;
        this.targetDate = data.targetDate;
        this.transferType = data.transferType;
    }

    validate() {
        if (this.targetAmount !== undefined && this.targetAmount <= 0) {
            throw new ErrorResponse('Target amount must be greater than 0', 400);
        }

        if (this.currentAmount !== undefined && this.currentAmount < 0) {
            throw new ErrorResponse('Current amount cannot be negative', 400);
        }

        if (this.priority !== undefined && (!Number.isInteger(this.priority) || this.priority < 1)) {
            throw new ErrorResponse('Priority must be a positive integer', 400);
        }

        if (this.transferType && !['EXPENSE', 'INVESTMENT'].includes(this.transferType)) {
            throw new ErrorResponse('Transfer type must be either EXPENSE or INVESTMENT', 400);
        }

        return true;
    }
}

export {
    CreateSavingGoalDto,
    ContributeToGoalDto,
    TransferFromGoalDto,
    UpdateSavingGoalDto
}; 