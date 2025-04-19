import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';
import { updateUser } from '../repositories/userRepository.js';
import ErrorResponse from './errorResponse.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a transporter for sending emails
const createTransporter = () => {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT);
    const secure = process.env.EMAIL_SECURE === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    console.log(`Creating email transporter with: ${host}:${port} (secure: ${secure})`);

    if (!host || !port || !user || !pass) {
        console.error('Email configuration missing. Check your .env file');
        throw new Error('Email configuration missing');
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
};

// Generate a verification token
export const generateVerificationToken = async (userId) => {
    try {
        // Generate a random token
        const token = cryptoRandomString({ length: 32, type: 'url-safe' });

        // Set expiration time (24 hours from now)
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);

        // Update user with verification token
        await updateUser(userId, {
            verificationToken: token,
            verificationExpires: expires
        });

        return token;
    } catch (error) {
        console.error('Error generating verification token:', error);
        throw new ErrorResponse('Failed to generate verification token', 500);
    }
};

// Send verification email
export const sendVerificationEmail = async (user, token) => {
    try {
        // Get frontend URL from environment or default
        const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:8080';

        // Create verification URL that points directly to the frontend verification page
        const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Wealth Management" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Verify Your Email Address',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${user.name},</h2>
              <p>Thank you for registering with our Finance Flow platform.</p>
              <p>Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This verification link will expire in 24 hours.</p>
              <p>If you did not create an account, please ignore this email.</p>
              <p>Thank you,<br>Finance Flow Team</p>
            </div>
          `
        };

        // Create a new transporter for each email to avoid connection issues
        const transporter = createTransporter();

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new ErrorResponse(`Failed to send verification email: ${error.message}`, 500);
    }
};

// Send email change verification email
export const sendEmailChangeVerification = async (user, token, newEmail) => {
    try {
        // Get frontend URL from environment or default
        const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:8080';

        // Create verification URL that points directly to the frontend verification page
        const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Wealth Management" <${process.env.EMAIL_USER}>`,
            to: newEmail,
            subject: 'Verify Your New Email Address',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${user.name},</h2>
              <p>You recently requested to change your email address on Finance Flow.</p>
              <p>Please verify your new email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Verify New Email Address
                </a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This verification link will expire in 24 hours.</p>
              <p>If you did not request this change, please contact our support team immediately.</p>
              <p>Thank you,<br>Finance Flow Team</p>
            </div>
          `
        };

        // Create a new transporter for each email to avoid connection issues
        const transporter = createTransporter();

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email change verification email sent: %s', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending email change verification:', error);
        throw new ErrorResponse(`Failed to send email change verification: ${error.message}`, 500);
    }
};

// Send password reset email
export const sendPasswordResetEmail = async (user, token) => {
    try {
        // Base URL from environment or default
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        // Create reset URL - frontend URL
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Wealth Management" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${user.name},</h2>
              <p>You requested a password reset for your Wealth Management account.</p>
              <p>Please click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p>${resetUrl}</p>
              <p>This reset link will expire in 1 hour.</p>
              <p>If you did not request a password reset, please ignore this email and ensure your account is secure.</p>
              <p>Thank you,<br>Wealth Management Team</p>
            </div>
          `
        };

        // Create a new transporter for each email to avoid connection issues
        const transporter = createTransporter();

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent: %s', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new ErrorResponse(`Failed to send password reset email: ${error.message}`, 500);
    }
};

// Verify an email using a token
export const verifyEmailWithToken = async (token) => {
    try {
        console.log('Verifying email with token:', token);

        // Find user with this token in the database
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationExpires: {
                    gt: new Date() // Token has not expired
                }
            }
        });

        if (!user) {
            throw new ErrorResponse('Invalid or expired verification token', 400);
        }

        console.log(`Found user for verification: ${user.id} (${user.email})`);

        // Current date for verification timestamp
        const now = new Date();

        // Update user as verified
        await updateUser(user.id, {
            isEmailVerified: true,
            emailVerifiedAt: now,
            verificationToken: null,
            verificationExpires: null
        });

        console.log(`User ${user.id} email verified successfully`);
        return true;
    } catch (error) {
        console.error('Error verifying email:', error);
        throw error;
    }
};

// Send test email to check configuration
export const sendTestEmail = async (to) => {
    try {
        console.log(`Sending test email to ${to}`);

        const mailOptions = {
            from: process.env.EMAIL_FROM || `"Wealth Management" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Test Email - Wealth Management',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Configuration Test</h2>
              <p>This is a test email to verify that the email service is working correctly.</p>
              <p>Your email configuration is working properly!</p>
              <p>Date/Time: ${new Date().toLocaleString()}</p>
            </div>
            `
        };

        // Create a new transporter for each email to avoid connection issues
        const transporter = createTransporter();

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Test email sent: %s', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending test email:', error);
        throw new ErrorResponse(`Failed to send test email: ${error.message}`, 500);
    }
}; 