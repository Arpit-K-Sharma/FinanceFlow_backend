import ErrorResponse from '../utils/errorResponse.js';

class CreateInvestmentDto {
    constructor(data) {
        this.assetName = data.assetName;
        this.amount = data.amount;
        this.investmentType = data.investmentType || `Investment in ${data.assetName}`;
        this.totalReturn = data.totalReturn || 0;
        this.isClosed = data.isClosed || false;
        this.notes = data.notes || `Investment in ${data.assetName} with initial amount of ${data.amount}`;
    }

    validate() {
        if (!this.assetName) {
            throw new ErrorResponse('Asset name is required', 400);
        }

        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        if (this.totalReturn !== undefined && this.totalReturn < 0) {
            throw new ErrorResponse('Total return cannot be negative', 400);
        }

        if (this.isClosed !== undefined && typeof this.isClosed !== 'boolean') {
            throw new ErrorResponse('isClosed must be a boolean value', 400);
        }

        return true;
    }
}

class UpdateInvestmentDto {
    constructor(data) {
        this.assetName = data.assetName;
        this.amount = data.amount;
        this.investmentType = data.investmentType;
        this.totalReturn = data.totalReturn;
        this.isClosed = data.isClosed;
        this.notes = data.notes;
    }

    validate() {
        if (this.amount !== undefined && this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        if (this.totalReturn !== undefined && this.totalReturn < 0) {
            throw new ErrorResponse('Total return cannot be negative', 400);
        }

        if (this.isClosed !== undefined && typeof this.isClosed !== 'boolean') {
            throw new ErrorResponse('isClosed must be a boolean value', 400);
        }

        return true;
    }
}

export {
    CreateInvestmentDto,
    UpdateInvestmentDto
};