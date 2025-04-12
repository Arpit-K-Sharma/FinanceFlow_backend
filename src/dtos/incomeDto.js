import ErrorResponse from '../utils/errorResponse.js';

class CreateIncomeDto {
    constructor(data) {
        this.amount = data.amount;
        this.description = data.description;
        this.type = data.type || 'regular';
        this.investmentId = data.investmentId;
    }

    validate() {
        // Validate amount
        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        // Validate type
        if (!['regular', 'investment_return'].includes(this.type)) {
            throw new ErrorResponse('Invalid type. Must be regular or investment_return', 400);
        }

        // Validate investmentId for investment returns
        if (this.type === 'investment_return' && !this.investmentId) {
            throw new ErrorResponse('Investment ID is required for investment returns', 400);
        }

        return true;
    }
}

export {
    CreateIncomeDto
}; 