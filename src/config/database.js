import pkg from "pg";
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const createDatabase = async () => {
    const client = new Client({
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        host: 'localhost',
        port: 5432,
        database: 'postgres' // Connect to default postgres database
    });

    try {
        await client.connect();

        // Check if database exists
        const result = await client.query(
            "SELECT datname FROM pg_database WHERE datname = $1",
            [process.env.POSTGRES_DB]
        );

        if (result.rows.length === 0) {
            // Database doesn't exist, create it
            await client.query(`CREATE DATABASE ${process.env.POSTGRES_DB}`);
            console.log(`Database ${process.env.POSTGRES_DB} created successfully`);
        } else {
            console.log(`Database ${process.env.POSTGRES_DB} exists, skipping creation`);
        }
    } catch (error) {
        if (error.code === '42P04') {
            // Error code for "database already exists"
            console.log(`Database ${process.env.POSTGRES_DB} exists, skipping creation`);
        } else {
            console.error('Error checking/creating database:', error);
            throw error;
        }
    } finally {
        await client.end();
    }
};

export default createDatabase;