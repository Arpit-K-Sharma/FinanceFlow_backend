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
        const verificationResult = await verify(token);

        // For GET requests, render HTML response directly
        if (req.method === 'GET') {
            // Determine the title and message based on verification result
            const title = verificationResult.alreadyVerified ? 'Email Already Verified' : 'Email Verification Successful';
            const message = verificationResult.alreadyVerified
                ? 'Your email was already verified. You can refresh your dashboard to see the updated status.'
                : 'Your email has been successfully verified! You can refresh your dashboard to see the updated status.';

            // Return HTML directly from the backend
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${title}</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background-color: #f5f7fa;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            color: #333;
                        }
                        .container {
                            background-color: white;
                            border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            padding: 2rem;
                            width: 90%;
                            max-width: 500px;
                            text-align: center;
                        }
                        .icon {
                            background-color: #ebf5eb;
                            border-radius: 50%;
                            width: 80px;
                            height: 80px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0 auto 1.5rem;
                        }
                        .title {
                            color: #2e7d32;
                            margin-bottom: 1rem;
                        }
                        .message {
                            line-height: 1.6;
                            margin-bottom: 1.5rem;
                        }
                        .button {
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            text-decoration: none;
                            display: inline-block;
                            margin-top: 1rem;
                        }
                        svg {
                            width: 40px;
                            height: 40px;
                            fill: #2e7d32;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <h1 class="title">${title}</h1>
                        <p class="message">${message}</p>
                        <a href="${process.env.FRONTEND_URL}/login" class="button">Go to Homepage</a>
                    </div>
                </body>
                </html>
            `);
        }

        // For API calls, return JSON response
        return res.status(200).json({
            status: 'success',
            alreadyVerified: verificationResult.alreadyVerified || false,
            message: verificationResult.message || 'Email verified successfully'
        });
    } catch (error) {
        console.error('Email verification error:', error);

        // For GET requests, render error HTML
        if (req.method === 'GET') {
            const errorMessage = error.message || 'Verification failed';

            return res.status(400).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification Failed</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background-color: #f5f7fa;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            color: #333;
                        }
                        .container {
                            background-color: white;
                            border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            padding: 2rem;
                            width: 90%;
                            max-width: 500px;
                            text-align: center;
                        }
                        .icon {
                            background-color: #fdeded;
                            border-radius: 50%;
                            width: 80px;
                            height: 80px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0 auto 1.5rem;
                        }
                        .title {
                            color: #d32f2f;
                            margin-bottom: 1rem;
                        }
                        .message {
                            line-height: 1.6;
                            margin-bottom: 1.5rem;
                        }
                        .button {
                            background-color: #2196F3;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                            text-decoration: none;
                            display: inline-block;
                            margin-top: 1rem;
                        }
                        svg {
                            width: 40px;
                            height: 40px;
                            fill: #d32f2f;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <h1 class="title">Email Verification Failed</h1>
                        <p class="message">${errorMessage}</p>
                        <a href="/" class="button">Go to Homepage</a>
                    </div>
                </body>
                </html>
            `);
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