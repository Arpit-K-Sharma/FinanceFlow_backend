import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new model in schema.prisma for AvailableIncome
// For now, we'll use the existing Income model with a special flag
const AVAILABLE_INCOME_FLAG = 'AVAILABLE_INCOME_BALANCE';

export const createIncome = async (userId, data) => {
    const newIncome = await prisma.income.create({
        data: {
            userId,
            ...data
        }
    });

    // Update available income in the dedicated model
    await updateAvailableIncome(userId, data.amount);

    return newIncome;
};

export const getTotalIncome = async (userId) => {
    // Get available income from the AvailableIncome model
    const availableIncome = await prisma.availableIncome.findUnique({
        where: { userId }
    });

    if (availableIncome) {
        return availableIncome.amount;
    }

    // If no available income record exists, calculate from all incomes
    // and create a record in the AvailableIncome model
    const incomes = await prisma.income.findMany({
        where: { userId },
        select: { amount: true }
    });

    const totalAmount = incomes.reduce((total, income) => total + income.amount, 0);

    // Create an available income record
    await prisma.availableIncome.upsert({
        where: { userId },
        update: { amount: totalAmount },
        create: {
            userId,
            amount: totalAmount
        }
    });

    return totalAmount;
};

export const updateAvailableIncome = async (userId, amountChange) => {
    // Use upsert to handle both update and create scenarios
    return await prisma.availableIncome.upsert({
        where: { userId },
        update: {
            amount: {
                increment: amountChange
            }
        },
        create: {
            userId,
            amount: amountChange
        }
    });
};

export const updateTotalIncome = async (userId, amountChange) => {
    return await updateAvailableIncome(userId, amountChange);
};

export const deleteUserAvailableIncome = async (userId) => {
    try {
        // Check if the record exists before attempting to delete
        const availableIncome = await prisma.availableIncome.findUnique({
            where: { userId }
        });

        if (availableIncome) {
            await prisma.availableIncome.delete({
                where: { userId }
            });
        }

        // Also delete all income records for the user
        await prisma.income.deleteMany({
            where: { userId }
        });

        return true;
    } catch (error) {
        console.error('Error deleting user available income:', error);
        throw error;
    }
}; 