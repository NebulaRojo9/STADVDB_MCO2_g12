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
        throw err;
    }
}

export const recoverFromLogs = async () => {
    // If file doesn't exist, return empty map
    if (!fs.existsSync(LOG_FILE)) return new Map();

    const fileStream = fs.createReadStream(LOG_FILE);
    const rl = readline.createInterface({ // what is this?
        input: fileStream,
        crlfDelay: Infinity
    });

    const transactions = new Map();

    for await (const line of rl) {
        if (!line.trim()) continue;

        // Parse line
        const [timestamp, transactionId, action, status, payloadStr] = line.split('|');

        if (!transactionId || !status) continue;

        try {
            const payload = JSON.parse(payloadStr || '{}');

            if (!transactions.has(transactionId)) {
                transactions.set(transactionId, { history: [] });
            }

            const transaction = transactions.get(transactionId);
            transaction.history.push({ status, timestamp });
            transaction.action = action;
            transaction.payload = payload;
            transaction.lastStatus = status; // what did the transaction end on? (prepare/commit)
        } catch (err) {
            console.error(`Corrupt log line: ${line}`, err);
            throw err;
        }
    }

    return transactions;
}