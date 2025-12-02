import mysql from 'mysql2/promise';
import { setTimeout as sleep } from 'timers/promises';
import 'dotenv/config';

const MAX_RETRIES = 5;
let pool = null;

[
  'DB_HOST',
  'DB_USER',
  'DB_PASS',
  'DB_PORT',
  'DB_DATABASE',
].forEach((v) => {
  if (!process.env[v]) throw new Error(`Missing environment variable: ${v}`);
});

async function connectWithRetry(pool) {
  let connected = false;
  let retries = MAX_RETRIES;
  let lastError = null;

  console.log(`Testing database connection for Pool ...`);

  while (retries > 0 && !connected) {
    try {
      // Attempt to get a connection to test connectivity
      const connection = await pool.getConnection();
      console.log(`✅ Pool connected successfully to database: ${process.env.DB_DATABASE}`);
      connection.release();
      connected = true;
    } catch (error) {
      lastError = error;
      retries--;

      if (retries > 0) {
        // Exponential backoff calculation: 2^(MAX_RETRIES - currentRetries) * 1000ms
        const delay = Math.pow(2, MAX_RETRIES - retries) * 1000;
        console.log(`Pool failed to connect. Retrying in ${delay / 1000}s... (${retries} attempts left)`);
        await sleep(delay);
      }
    }
  }

  if (!connected) {
    console.error(`❌ Failed to connect Pool after multiple attempts:`, lastError);
    throw lastError;
  }
}

export const initDB = async () => {
  if (pool) return;

  console.log('Initializing database connection pool...');

  // Connect to pool
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    idleTimeout: 20000,
  });

  try {
    await connectWithRetry(pool);
    console.log('DB Pool initialized successfully.');
  } catch (error) {
    console.error('Database initialization failed. Shutting down active pools.');
    await closeDB();
    throw error;
  }
};

export const getDB = async () => pool;

export const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
  console.log('Database connection pool closed.');
};
