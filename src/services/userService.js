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

    return {
        ...userWithoutPassword,
        token: generateToken(user.id)
    };
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

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

export {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    deleteProfile
};
