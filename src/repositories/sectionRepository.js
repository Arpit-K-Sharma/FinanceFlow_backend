import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSection = async (userId, data) => {
    return await prisma.section.create({
        data: {
            userId,
            ...data
        }
    });
};

export const getSectionByUserId = async (userId) => {
    return await prisma.section.findFirst({
        where: { userId }
    });
};

export const updateSection = async (userId, updateData) => {
    return await prisma.section.update({
        where: { userId },
        data: updateData
    });
};

export const deleteSection = async (userId) => {
    const section = await getSectionByUserId(userId);
    if (section) {
        return await prisma.section.delete({
            where: { userId }
        });
    }
    return null;
};