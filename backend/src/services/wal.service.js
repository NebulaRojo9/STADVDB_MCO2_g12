import fs from 'fs';
import path from 'path';
import readline from 'readline';

const LOG_DIR = path.resolve('logs');

// Check if log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, `wal_${process.env.PORT}.log`);

// Check if log file exists
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
}

// FORMAT: timestamp|transactionID|action|status|payload
export const writeLog = (transactionId, action, status, payload = {}) => {
    const timestamp = new Date().toISOString();

    const entry = `${timestamp}|${transactionId}|${action}|${status}|${JSON.stringify(payload)}\n`

    try {
        fs.appendFileSync(LOG_FILE, entry);
    } catch (err) {
        console.error("Failed to write WAL", err);
    }
}