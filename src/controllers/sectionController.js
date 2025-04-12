import * as sectionService from '../services/sectionService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { UpdateSectionDto } from '../dtos/sectionDto.js';

export const getSection = asyncHandler(async (req, res, next) => {
    try {
        const section = await sectionService.getSectionByUserId(req.user.id);
        res.json(section);
    } catch (error) {
        next(error);
    }
});

export const updateSection = asyncHandler(async (req, res, next) => {
    try {
        const sectionData = new UpdateSectionDto(req.body);
        sectionData.validate();
        const section = await sectionService.updateSection(req.user.id, sectionData, req.body.description);
        res.json(section);
    } catch (error) {
        next(error);
    }
});

export const distributeMoney = asyncHandler(async (req, res, next) => {
    try {
        const result = await sectionService.distributeMoney(req.user.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
});