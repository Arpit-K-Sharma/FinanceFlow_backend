// File: scripts/reset-db.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Extract database name from DATABASE_URL
const getDatabaseName = () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return null;
    }

    try {
        // Parse the database URL to extract the database name
        const matches = dbUrl.match(/\/([^/?]+)(\?|$)/);
        return matches ? matches[1] : null;
    } catch (error) {
        log(`Error extracting database name: ${error.message}`);
        return null;
    }
};

// Log with timestamp
const log = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
};

// Execute a command and return a promise
const execPromise = (command) => {
    return new Promise((resolve, reject) => {
        log(`Executing: ${command}`);
        exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
            if (error) {
                log(`Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                log(`Command output (stderr): ${stderr}`);
            }
            log(`Command output: ${stdout}`);
            resolve(stdout);
        });
    });
};

// Delete directory recursively
const deleteDirectory = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        log(`Deleting directory: ${dirPath}`);
        fs.rmSync(dirPath, { recursive: true, force: true });
        log(`Directory deleted: ${dirPath}`);
    } else {
        log(`Directory does not exist, skipping deletion: ${dirPath}`);
    }
};

// Create a temporary SQL file
const createTempSqlFile = (sql) => {
    const tempFile = path.join(rootDir, 'temp_sql_command.sql');
    fs.writeFileSync(tempFile, sql);
    return tempFile;
};

// Delete a temporary file
const deleteTempFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

// Main reset function - without using prisma migrations
const resetDatabase = async () => {
    try {
        log('Starting database reset process...');

        // 1. Delete the Prisma generated client directories
        const prismaClientDir = path.join(rootDir, 'node_modules', '.prisma');
        const prismaClientGenDir = path.join(rootDir, 'node_modules', '@prisma', 'client');

        log('Cleaning up Prisma client directories...');
        deleteDirectory(prismaClientDir);
        deleteDirectory(prismaClientGenDir);

        // 2. Drop and recreate the entire database
        const dbName = getDatabaseName();
        if (dbName) {
            log(`Attempting to drop database: ${dbName}`);
            try {
                // Create a modified connection URL for connecting to postgres directly
                const adminDbUrl = process.env.DATABASE_URL.replace(`/${dbName}`, '/postgres');

                // Create a temporary SQL file
                const sqlCommand = `DROP DATABASE IF EXISTS "${dbName}"; CREATE DATABASE "${dbName}";`;
                const tempFile = createTempSqlFile(sqlCommand);

                // Drop the database if it exists and create it again
                await execPromise(`npx prisma db execute --url="${adminDbUrl}" --file="${tempFile}"`);
                deleteTempFile(tempFile);
                log(`Database ${dbName} dropped and recreated successfully`);

                // 3. Generate schema SQL from Prisma schema instead of using db push
                log('Generating SQL schema from Prisma...');

                // First, generate Prisma client to ensure the schema is valid
                await execPromise('npx prisma generate --no-engine');

                // Use Prisma to format the schema (without migrations) into SQL
                const schemaSqlPath = path.join(rootDir, 'prisma', 'schema.sql');
                await execPromise(`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ${schemaSqlPath}`);

                log('Applying schema to database directly via SQL...');
                // Apply the SQL directly without creating _prisma_migrations table
                await execPromise(`npx prisma db execute --file="${schemaSqlPath}"`);

                // Clean up the SQL file
                if (fs.existsSync(schemaSqlPath)) {
                    fs.unlinkSync(schemaSqlPath);
                }

                // No need to drop _prisma_migrations table since we never created it

                log('Database schema applied successfully without creating migration table!');

                // 4. Generate the Prisma client now that the schema is applied
                log('Generating Prisma client...');
                await execPromise('npx prisma generate');
            } catch (error) {
                log(`Error: ${error.message}`);

                // Fallback to regular db push if the schema SQL approach fails
                log('Falling back to standard prisma db push...');
                await execPromise('npx prisma db push --force-reset --accept-data-loss --skip-generate');

                // Remove the migrations table if it was created by the fallback
                try {
                    log('Removing _prisma_migrations table...');
                    const dropMigrationsSQL = 'DROP TABLE IF EXISTS "_prisma_migrations";';
                    const tempFile = createTempSqlFile(dropMigrationsSQL);
                    await execPromise(`npx prisma db execute --file="${tempFile}"`);
                    deleteTempFile(tempFile);
                    log('_prisma_migrations table removed successfully');

                    // Generate the Prisma client
                    log('Generating Prisma client...');
                    await execPromise('npx prisma generate');
                } catch (err) {
                    log(`Note: Could not drop _prisma_migrations table: ${err.message}`);
                }
            }
        } else {
            log('Could not determine database name, falling back to table-level reset');

            // Fallback to db push
            await execPromise('npx prisma db push --force-reset --accept-data-loss --skip-generate');

            // Remove migrations table
            try {
                log('Removing _prisma_migrations table...');
                const dropMigrationsSQL = 'DROP TABLE IF EXISTS "_prisma_migrations";';
                const tempFile = createTempSqlFile(dropMigrationsSQL);
                await execPromise(`npx prisma db execute --file="${tempFile}"`);
                deleteTempFile(tempFile);
                log('_prisma_migrations table removed successfully');

                // Generate the Prisma client
                log('Generating Prisma client...');
                await execPromise('npx prisma generate');
            } catch (err) {
                log(`Note: Could not drop _prisma_migrations table: ${err.message}`);
            }
        }

        log('Database reset completed successfully!');
        return { success: true };
    } catch (error) {
        log(`Error during reset: ${error.message}`);
        process.exit(1);
    }
};

// Execute the reset function
resetDatabase(); 