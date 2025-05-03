import { getUserByEmail, createUser, getUserById, updateUser, deleteUser } from '../repositories/userRepository.js';
import { createSection, deleteSection } from '../repositories/sectionRepository.js';
import { deleteUserTransactions } from '../repositories/transactionRepository.js';
import { deleteUserExpenses } from '../repositories/expenseRepository.js';
import { deleteUserInvestments } from '../repositories/investmentRepository.js';
import { deleteUserSavingGoals } from '../repositories/savingGoalRepository.js';
import { deleteUserAvailableIncome } from '../repositories/incomeRepository.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ErrorResponse from '../utils/errorResponse.js';
import { generateVerificationToken, sendVerificationEmail, verifyEmailWithToken, sendEmailChangeVerification } from '../utils/emailService.js';

const registerUser = async (userData) => {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
        throw new ErrorResponse('User already exists', 400);
    }

    // Create user
    const user = await createUser(userData);

    // Create initial section for the user
    await createSection(user.id, {
        savings: 0,
        expenses: 0,
        investments: 0
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
        ...userWithoutPassword,
        token: generateToken(user.id)
    };
};

const loginUser = async (email, password) => {
    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    // Remove password from response
    const { password: userPassword, ...userWithoutPassword } = user;

    // Check if email is verified and add a warning if not
    const responseData = {
        ...userWithoutPassword,
        token: generateToken(user.id)
    };

    if (!user.isEmailVerified) {
        responseData.warning = 'Email not verified. You can verify your email through your account settings.';
    }

    return responseData;
};

const getProfile = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
};

const updateProfile = async (userId, updateData) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    const updatedUser = await updateUser(userId, updateData);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
};

const updateEmail = async (userId, newEmail) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    // Check if email is being changed
    if (user.email === newEmail) {
        throw new ErrorResponse('New email is the same as current email', 400);
    }

    // Check if new email already exists for another user
    const existingUser = await getUserByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
        throw new ErrorResponse('Email already in use by another account', 400);
    }

    // Update email and set verification status to false
    const updatedUser = await updateUser(userId, {
        email: newEmail,
        isEmailVerified: false,
        verificationToken: null,
        verificationExpires: null
    });

    // Generate verification token for new email
    const token = await generateVerificationToken(userId);

    // Send verification email to new address
    await sendEmailChangeVerification(updatedUser, token, newEmail);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return {
        user: userWithoutPassword,
        message: 'Email updated. Please verify your new email address.'
    };
};

const deleteProfile = async (userId) => {
    try {
        // Delete all related records in the correct order
        await Promise.all([
            deleteUserTransactions(userId).catch((e) => console.error('Error deleting transactions:', e)),
            deleteUserExpenses(userId).catch((e) => console.error('Error deleting expenses:', e)),
            deleteUserInvestments(userId).catch((e) => console.error('Error deleting investments:', e)),
            deleteUserSavingGoals(userId).catch((e) => console.error('Error deleting saving goals:', e)),
            deleteUserAvailableIncome(userId).catch((e) => console.error('Error deleting available income:', e)),
            deleteSection(userId).catch((e) => console.error('Error deleting section:', e))
        ]);

        // Finally delete the user
        return await deleteUser(userId);
    } catch (error) {
        console.error('Error in deleteProfile:', error);
        throw new ErrorResponse('Error deleting user profile', 500);
    }
};

// Send a verification email to the user
const sendVerificationRequest = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    if (user.isEmailVerified) {
        throw new ErrorResponse('Email is already verified', 400);
    }

    console.log(`Generating verification token for user: ${user.id}`);
    const token = await generateVerificationToken(user.id);
    console.log(`Sending verification email to: ${user.email}`);
    await sendVerificationEmail(user, token);
    console.log('Verification email sent successfully');

    return { message: 'Verification email sent successfully. Please check your inbox.' };
};

// Verify user's email with token
const verifyEmail = async (token) => {
    if (!token) {
        throw new ErrorResponse('Verification token is required', 400);
    }

    // Get the complete verification response
    const verificationResult = await verifyEmailWithToken(token);

    // Return the complete result
    return {
        success: verificationResult.success,
        alreadyVerified: verificationResult.alreadyVerified || false,
        message: verificationResult.message
    };
};

// Check if email is verified
const checkEmailVerified = async (userId) => {
    const user = await getUserById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    return user.isEmailVerified;
};

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

export {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    updateEmail,
    deleteProfile,
    verifyEmail,
    sendVerificationRequest,
    checkEmailVerified
};
