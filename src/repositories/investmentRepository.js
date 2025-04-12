import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInvestmentsByUserId = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [investments, total] = await Promise.all([
        prisma.investment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.investment.count({
            where: { userId }
        })
    ]);

    return {
        data: investments,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const getInvestmentById = async (id, userId) => {
    return await prisma.investment.findFirst({
        where: { id: parseInt(id), userId }
    });
};

export const createInvestment = async (userId, investmentData) => {
    return await prisma.investment.create({
        data: {
            ...investmentData,
            userId
        }
    });
};

export const updateInvestment = async (id, userId, investmentData) => {
    return await prisma.investment.update({
        where: { id: parseInt(id), userId },
        data: {
            ...investmentData,
            totalReturn: investmentData.totalReturn,
            isClosed: investmentData.isClosed
        }
    });
};

export const deleteInvestment = async (id, userId) => {
    return await prisma.investment.delete({
        where: { id: parseInt(id), userId }
    });
};

export const deleteUserInvestments = async (userId) => {
    return await prisma.investment.deleteMany({
        where: { userId }
    });
};

export const getInvestmentsByType = async (userId, investmentType) => {
    return await prisma.investment.findMany({
        where: {
            userId,
            investmentType
        }
    });
};