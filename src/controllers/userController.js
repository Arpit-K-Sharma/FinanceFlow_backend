import { registerUser as register, loginUser as login, getProfile as get, updateProfile as update, deleteProfile as remove, verifyEmail as verify, sendVerificationRequest as sendVerification, updateEmail as changeEmail } from '../services/userService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateUserDto, UpdateUserDto } from '../dtos/userDto.js';
import ErrorResponse from '../utils/errorResponse.js';
import bcrypt from 'bcryptjs';
import { getUserById } from '../repositories/userRepository.js';

export const registerUser = asyncHandler(async (req, res, next) => {
    try {
        const userDto = new CreateUserDto(req.body);
        userDto.validate();

        const user = await register(userDto);

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully. You can verify your email through your account settings.',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const loginUser = asyncHandler(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await login(email, password);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const getProfile = asyncHandler(async (req, res, next) => {
    try {
        const user = await get(req.user.id);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    try {
        const userDto = new UpdateUserDto(req.body);
        userDto.validate();

        const user = await update(req.user.id, userDto);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const updateUserEmail = asyncHandler(async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new ErrorResponse('Email is required', 400));
        }

        const result = await changeEmail(req.user.id, email);

        res.status(200).json({
            status: 'success',
            message: result.message,
            data: result.user
        });
    } catch (error) {
        next(error);
    }
});

export const deleteProfile = asyncHandler(async (req, res, next) => {
    try {
        await remove(req.user.id);

        res.status(200).json({
            status: 'success',
            message: 'User deleted'
        });
    } catch (error) {
        next(error);
    }
});

export const confirmDeleteProfile = asyncHandler(async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password) {
            return next(new ErrorResponse('Password is required to delete your account', 400));
        }

        // Get user with password
        const user = await getUserById(req.user.id);
        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new ErrorResponse('Incorrect password', 401));
        }

        // Delete user if password is correct
        await remove(req.user.id);

        res.status(200).json({
            status: 'success',
            message: 'Your account has been permanently deleted'
        });
    } catch (error) {
        next(error);
    }
});

export const verifyEmailToken = asyncHandler(async (req, res, next) => {
    try {
        // Get token from either params (GET request) or body (POST request)
        const token = req.params.token || req.body.token;

        if (!token) {
            return next(new ErrorResponse('Verification token is required', 400));
        }

        console.log(`Attempting to verify email with token: ${token}`);
        await verify(token);

        // If this is a GET request (from email link), redirect to frontend
        if (req.method === 'GET') {
            // Get frontend URL from environment variables with a fallback
            const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000';

            // Redirect to the frontend verification page
            return res.redirect(`${frontendUrl}/verify-email?token=${token}`);
        }

        // If this is a POST request (API call from frontend), return JSON response
        return res.status(200).json({
            status: 'success',
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Email verification error:', error);

        // If this is a GET request, redirect to frontend with error
        if (req.method === 'GET') {
            const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/verify-email?error=${encodeURIComponent(error.message || 'Verification failed')}`);
        }

        // Otherwise return JSON error
        return next(error);
    }
});

export const sendVerificationEmail = asyncHandler(async (req, res, next) => {
    try {
        const result = await sendVerification(req.user.id);

        res.status(200).json({
            status: 'success',
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});