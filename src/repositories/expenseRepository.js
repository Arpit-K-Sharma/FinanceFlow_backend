import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getExpensesByUserId = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.expense.count({
            where: { userId }
        })
    ]);

    return {
        data: expenses,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const getExpenseById = async (id, userId) => {
    return await prisma.expense.findFirst({
        where: { id: parseInt(id), userId }
    });
};

export const createExpense = async (userId, expenseData) => {
    return await prisma.expense.create({
        data: {
            ...expenseData,
            userId
        }
    });
};

export const updateExpense = async (id, userId, expenseData) => {
    return await prisma.expense.update({
        where: { id: parseInt(id), userId },
        data: expenseData
    });
};

export const deleteExpense = async (id, userId) => {
    return await prisma.expense.delete({
        where: { id: parseInt(id), userId }
    });
};

export const deleteUserExpenses = async (userId) => {
    return await prisma.expense.deleteMany({
        where: { userId }
    });
};