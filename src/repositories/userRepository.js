import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const getUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id: parseInt(id) }
    });
};

export const getUserByEmail = async (email) => {
    return await prisma.user.findUnique({
        where: { email }
    });
};

export const createUser = async (userData) => {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return await prisma.user.create({
        data: {
            ...userData,
            password: hashedPassword
        }
    });
};

export const updateUser = async (id, userData) => {
    if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
    }
    return await prisma.user.update({
        where: { id: parseInt(id) },
        data: userData
    });
};

export const updateSavingsBalance = async (id, amount) => {
    return await prisma.user.update({
        where: { id: parseInt(id) },
        data: {
            savingsBalance: amount
        }
    });
};

export const deleteUser = async (id) => {
    return await prisma.user.delete({
        where: { id: parseInt(id) }
    });
};
