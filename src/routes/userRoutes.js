import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile, deleteProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const userRoutes = express.Router();

userRoutes.post('/register', registerUser);
userRoutes.post('/login', loginUser);
userRoutes.get('/profile', protect, getProfile);
userRoutes.put('/profile', protect, updateProfile);
userRoutes.delete('/profile', protect, deleteProfile);

export default userRoutes;