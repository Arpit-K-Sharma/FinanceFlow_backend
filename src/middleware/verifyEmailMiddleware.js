import { checkEmailVerified } from '../services/userService.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * Middleware to check if user's email is verified
 * Used for routes that require email verification
 */
export const requireEmailVerified = async (req, res, next) => {
    try {
        const isVerified = await checkEmailVerified(req.user.id);

        if (!isVerified) {
            return next(new ErrorResponse('Email verification required. Please verify your email address.', 403));
        }

        next();
    } catch (error) {
        next(error);
    }
}; 