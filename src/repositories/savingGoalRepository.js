import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSavingGoalsByUserId = async (userId, page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit;

        const [savingGoals, total] = await Promise.all([
            prisma.savingGoal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.savingGoal.count({
                where: { userId }
            })
        ]);

        return {
            data: savingGoals,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('Error in getSavingGoalsByUserId:', error);
        throw error;
    }
};

export const getSavingGoalById = async (id, userId) => {
    try {
        return await prisma.savingGoal.findFirst({
            where: { id: parseInt(id), userId }
        });
    } catch (error) {
        console.error('Error in getSavingGoalById:', error);
        throw error;
    }
};

export const createSavingGoal = async (userId, goalData) => {
    try {
        return await prisma.savingGoal.create({
            data: {
                ...goalData,
                userId
            }
        });
    } catch (error) {
        console.error('Error in createSavingGoal:', error);
        throw error;
    }
};

export const updateSavingGoal = async (id, userId, goalData) => {
    try {
        return await prisma.savingGoal.update({
            where: { id: parseInt(id), userId },
            data: goalData
        });
    } catch (error) {
        console.error('Error in updateSavingGoal:', error);
        throw error;
    }
};

export const deleteSavingGoal = async (id, userId) => {
    try {
        return await prisma.savingGoal.delete({
            where: { id: parseInt(id), userId }
        });
    } catch (error) {
        console.error('Error in deleteSavingGoal:', error);
        throw error;
    }
};

export const deleteUserSavingGoals = async (userId) => {
    try {
        return await prisma.savingGoal.deleteMany({
            where: { userId }
        });
    } catch (error) {
        console.error('Error in deleteUserSavingGoals:', error);
        throw error;
    }
}; 