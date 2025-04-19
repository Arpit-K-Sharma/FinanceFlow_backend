import express from 'express';
import { registerUser, loginUser, getProfile, updateProfile, deleteProfile, verifyEmailToken, sendVerificationEmail, updateUserEmail, confirmDeleteProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sendTestEmail } from '../utils/emailService.js';

const userRoutes = express.Router();

// Email test route
userRoutes.get('/test-email', async (req, res) => {
    try {
        const email = req.query.email || 'luciferdynamic598@gmail.com';
        await sendTestEmail(email);
        res.json({
            success: true,
            message: `Test email sent to ${email}. Please check your inbox or spam folder.`
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

// Public routes
userRoutes.post('/register', registerUser);
userRoutes.post('/login', loginUser);
userRoutes.get('/verify-email/:token', verifyEmailToken);
userRoutes.post('/verify-email', verifyEmailToken);

// Protected routes - require authentication
userRoutes.get('/profile', protect, getProfile);
userRoutes.put('/profile', protect, updateProfile);
userRoutes.delete('/profile', protect, deleteProfile);
userRoutes.post('/send-verification', protect, sendVerificationEmail);
userRoutes.post('/update-email', protect, updateUserEmail);
userRoutes.post('/delete-account', protect, confirmDeleteProfile);

export default userRoutes;