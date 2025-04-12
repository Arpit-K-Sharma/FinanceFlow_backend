import ErrorResponse from '../utils/errorResponse.js';

class CreateExpenseDto {
    constructor(data) {
        this.amount = data.amount;
        this.category = data.category;
        this.description = data.description;
    }

    validate() {
        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        if (!this.category) {
            throw new ErrorResponse('Category is required', 400);
        }

        return true;
    }
}

class UpdateExpenseDto {
    constructor(data) {
        this.amount = data.amount;
        this.category = data.category;
        this.description = data.description;
    }

    validate() {
        if (this.amount !== undefined && this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        return true;
    }
}

export {
    CreateExpenseDto,
    UpdateExpenseDto
};
