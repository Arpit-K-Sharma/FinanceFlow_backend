import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import createDatabase from './src/config/database.js';
import userRoutes from './src/routes/userRoutes.js';
import sectionRoutes from './src/routes/sectionRoutes.js';
import savingGoalRoutes from './src/routes/savingGoalRoutes.js';
import transactionRoutes from './src/routes/transactionRoutes.js';
import expenseRoutes from './src/routes/expenseRoutes.js';
import investmentRoutes from './src/routes/investmentRoutes.js';
import incomeRoutes from './src/routes/incomeRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import errorHandler from './src/middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

const runPrismaCommand = (command) => {
    return new Promise((resolve, reject) => {
        const process = spawn('npx', ['prisma', command], {
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Prisma ${command} failed with code ${code}`));
        });
    });
};

const initializeDatabase = async () => {
    try {
        // Only create database if it doesn't exist
        await createDatabase();

        console.log('Ensuring database schema is up to date...');

        try {
            // Test database connection first
            await prisma.$connect();
            console.log('Database connection successful');

            // Try a simple query
            await prisma.user.findMany();
            console.log('Database tables exist and are accessible');
        } catch (error) {
            console.log('Database tables not found, creating schema...');

            // Generate Prisma client
            await runPrismaCommand('generate');

            // Push schema changes
            await runPrismaCommand('db push');

            console.log('Schema push completed');
        }
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
};

// Initialize database before starting the server
initializeDatabase().then(() => {
    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Test route
    app.get('/api/test', (req, res) => {
        res.json({ message: 'Server is working!' });
    });

    // Routes
    app.use('/api/users', userRoutes);
    app.use('/api/sections', sectionRoutes);
    app.use('/api/saving-goals', savingGoalRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/investments', investmentRoutes);
    app.use('/api/income', incomeRoutes);
    app.use('/api/reports', reportRoutes);

    // Error handling middleware
    app.use(errorHandler);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// Handle cleanup
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default app;