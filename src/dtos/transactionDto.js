import ErrorResponse from '../utils/errorResponse.js';

// Define the standard transaction types
const TRANSACTION_TYPES = {
    AUTOMATIC: 'automatic', // Used when money is distributed using distribute money API
    MANUAL: 'manual',       // Used for user-created transfers between sections
    LEFTOVER: 'leftover',   // Used for leftover money transactions
    GOAL_TRANSFER: 'goal-transfer', // Used for saving goal-related transactions
    REFUND: 'refund'        // Used for refunding expenses or investments when deleted
};

// List of valid transaction types
const VALID_TRANSACTION_TYPES = Object.values(TRANSACTION_TYPES);

class CreateTransactionDto {
    constructor(data) {
        this.type = data.type;
        this.fromSection = data.fromSection;
        this.toSection = data.toSection;
        this.amount = data.amount;
        this.description = data.description;
    }

    validate() {
        if (!VALID_TRANSACTION_TYPES.includes(this.type)) {
            throw new ErrorResponse('Invalid transaction type', 400);
        }

        if (!this.amount || this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        const validSections = ['savings', 'expenses', 'investments'];

        if (this.fromSection && !validSections.includes(this.fromSection)) {
            throw new ErrorResponse('Invalid from section', 400);
        }

        if (this.toSection && !validSections.includes(this.toSection)) {
            throw new ErrorResponse('Invalid to section', 400);
        }

        if (this.fromSection && this.toSection && this.fromSection === this.toSection) {
            throw new ErrorResponse('From and to sections cannot be the same', 400);
        }

        return true;
    }
}

class UpdateTransactionDto {
    constructor(data) {
        this.type = data.type;
        this.fromSection = data.fromSection;
        this.toSection = data.toSection;
        this.amount = data.amount;
        this.description = data.description;
    }

    validate() {
        if (this.type && !VALID_TRANSACTION_TYPES.includes(this.type)) {
            throw new ErrorResponse('Invalid transaction type', 400);
        }

        if (this.amount !== undefined && this.amount <= 0) {
            throw new ErrorResponse('Amount must be greater than 0', 400);
        }

        const validSections = ['savings', 'expenses', 'investments'];

        if (this.fromSection && !validSections.includes(this.fromSection)) {
            throw new ErrorResponse('Invalid from section', 400);
        }

        if (this.toSection && !validSections.includes(this.toSection)) {
            throw new ErrorResponse('Invalid to section', 400);
        }

        if (this.fromSection && this.toSection && this.fromSection === this.toSection) {
            throw new ErrorResponse('From and to sections cannot be the same', 400);
        }

        return true;
    }
}

export {
    CreateTransactionDto,
    UpdateTransactionDto,
    TRANSACTION_TYPES,
    VALID_TRANSACTION_TYPES
};