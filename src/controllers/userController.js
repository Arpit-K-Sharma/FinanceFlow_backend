import { registerUser as register, loginUser as login, getProfile as get, updateProfile as update, deleteProfile as remove } from '../services/userService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CreateUserDto, UpdateUserDto } from '../dtos/userDto.js';

export const registerUser = asyncHandler(async (req, res, next) => {
    try {
        const userDto = new CreateUserDto(req.body);
        userDto.validate();

        const user = await register(userDto);

        res.status(201).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const loginUser = asyncHandler(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await login(email, password);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const getProfile = asyncHandler(async (req, res, next) => {
    try {
        const user = await get(req.user.id);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    try {
        const userDto = new UpdateUserDto(req.body);
        userDto.validate();

        const user = await update(req.user.id, userDto);

        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

export const deleteProfile = asyncHandler(async (req, res, next) => {
    try {
        await remove(req.user.id);

        res.status(200).json({
            status: 'success',
            message: 'User deleted'
        });
    } catch (error) {
        next(error);
    }
});