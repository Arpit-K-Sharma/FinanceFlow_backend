import ErrorResponse from '../utils/errorResponse.js';

class UpdateSectionDto {
    constructor(data) {
        this.savings = data.savings;
        this.expenses = data.expenses;
        this.investments = data.investments;
    }

    validate() {
        if (this.savings !== undefined && this.savings < 0) {
            throw new ErrorResponse('Savings amount cannot be negative', 400);
        }

        if (this.expenses !== undefined && this.expenses < 0) {
            throw new ErrorResponse('Expenses amount cannot be negative', 400);
        }

        if (this.investments !== undefined && this.investments < 0) {
            throw new ErrorResponse('Investments amount cannot be negative', 400);
        }

        return true;
    }
}

export { UpdateSectionDto };
