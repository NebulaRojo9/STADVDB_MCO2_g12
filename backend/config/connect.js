import mysql from 'mysql2/promise';
import { setTimeout as sleep } from 'timers/promises';
import 'dotenv/config';

let pool1 = null;
let pool2 = null;
let pool3 = null;
const MAX_RETRIES = 5;

async function connectWithRetry(pool, poolNumber) {
    let connected = false;
    let retries = MAX_RETRIES;
    let lastError = null;

    console.log(`Testing database connection for Pool ${poolNumber}...`);

    while (retries > 0 && !connected) {
        try {
            // Attempt to get a connection to test connectivity
            const connection = await pool.getConnection();
            console.log(`✅ Pool ${poolNumber} connected successfully to database: ${process.env.DB_DATABASE}`);
            connection.release(); // Release the test connection
            connected = true;
        } catch (error) {
            lastError = error;
            retries--;

            if (retries > 0) {
                // Exponential backoff calculation: 2^(MAX_RETRIES - currentRetries) * 1000ms
                const delay = Math.pow(2, MAX_RETRIES - retries) * 1000;
                console.log(
                    `Pool ${poolNumber} failed to connect. Retrying in ${delay / 1000}s... (${retries} attempts left)`
                );
                await sleep(delay);
            }
        }
    }

    if (!connected) {
        console.error(
            `\n❌ Failed to connect Pool ${poolNumber} after multiple attempts:`,
            lastError
        );
        // Throw the error to stop the initialization process
        throw lastError;
    }
}

export const initDB = async () => {
    if (pool1 && pool2) return; // Existing pool is returned if exists

    console.log('Initializing database connection pool...');

    // Connect to pool 1
    pool1 = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS1,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT1,
    });

    // Connect to pool 2
    pool2 = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS2,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT2,
    });

    // Connect to pool 3
    pool3 = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS3,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT3,
    });

    try {
        await connectWithRetry(pool1, 1);
        await connectWithRetry(pool2, 2);
        await connectWithRetry(pool3, 3);
        console.log('All database pools initialized successfully.');
    } catch (error) {
        console.error('Database initialization failed. Shutting down active pools.');
        await closeDB();
        throw error; // Rethrow the error after cleanup
    }
};

export const getDB = async (i) => {
    if (i == 1) {
        // return pool for first database
        return pool1;
    } else if (i == 2) {
        // return pool for second database
        return pool2;
    } else if (i == 3) {
        return pool3;
    } else {
        throw new Error('Invalid database identifier');
    }

    /* if (!pool) {
        initDB();
        return getDB(i);
    }

    return pool; */
};

export const closeDB = async () => {
    if (pool1) {
        await pool1.end();
        pool1 = null;
    }

    if (pool2) {
        await pool2.end();
        pool2 = null;
    }

    if (pool3) {
        await pool3.end();
        pool3 = null;
    }

    console.log('Database connection pools closed.');
};