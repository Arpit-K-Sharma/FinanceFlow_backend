import { PrismaClient } from '@prisma/client';
import { VALID_TRANSACTION_TYPES } from '../dtos/transactionDto.js';

const prisma = new PrismaClient();

export const getTransactionsByUserId = async (userId, page = 1, limit = 10, type = null) => {
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause = { userId };

    // Filter by type
    if (type && type !== 'all') {
        // If a specific type is requested and it's valid
        if (VALID_TRANSACTION_TYPES.includes(type)) {
            whereClause.type = type;
        }
    } else if (type === 'all') {
        // If 'all' is specified, include all valid transaction types
        whereClause.type = { in: VALID_TRANSACTION_TYPES };
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.transaction.count({
            where: whereClause
        })
    ]);

    return {
        data: transactions,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            validTypes: VALID_TRANSACTION_TYPES
        }
    };
};

export const getTransactionById = async (id, userId) => {
    return await prisma.transaction.findFirst({
        where: { id: parseInt(id), userId }
    });
};

export const createTransaction = async (userId, transactionData) => {
    return await prisma.transaction.create({
        data: {
            ...transactionData,
            userId
        }
    });
};

export const updateTransaction = async (id, userId, transactionData) => {
    return await prisma.transaction.update({
        where: { id: parseInt(id), userId },
        data: transactionData
    });
};

export const deleteTransaction = async (id, userId) => {
    return await prisma.transaction.delete({
        where: { id: parseInt(id), userId }
    });
};

export const deleteUserTransactions = async (userId) => {
    return await prisma.transaction.deleteMany({
        where: { userId }
    });
};