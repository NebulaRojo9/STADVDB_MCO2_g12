import fs from 'fs';
import path from 'path';
import readline from 'readline';
import axios from 'axios';
import { registry } from './crud_registry.js'

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

export const askPeersForDecision = async (transactionId, PEER_NODES) => {
    let peersCommitted = false;

    for (const peerUrl of PEER_NODES) {
        try {
            const history = await getTransactionLog(transactionId);
            console.log("History skibidy!!!");
            console.log(history)
            const response = await axios.post(`${peerUrl}/internal/checkStatus/${transactionId}`)
            const peerStatus = response.data.status;
            console.log(peerUrl)
            console.log("peerStatus: ", peerStatus)

            if (peerStatus === 'COMMIT') peersCommitted = true;
        } catch (error) {
            console.error(`Failed to contact peer ${peerUrl}`);
        }
    }

    if (peersCommitted) return 'COMMIT'
    else return 'ABORT';
}

export const getTransactionLog = async (targetId) => {
    if (!fs.existsSync(LOG_FILE)) return null;

    const fileStream = fs.createReadStream(LOG_FILE);
    const rl = readline.createInterface({ // what is this?
        input: fileStream,
        crlfDelay: Infinity
    });

    let transaction = null;

    for await (const line of rl) {
        if (!line.trim()) continue;

        // Parse line
        let [timestamp, transactionId, action, status, payloadStr] = line.split('|');
        
        let transactionIdCleaned = transactionId ? transactionId.trim() : '';

        /* console.log("transactionIdCleaned:", transactionIdCleaned)
        console.log("targetId", targetId); */
        if (transactionIdCleaned !== targetId) {
            continue;
        }

        try {
            // Initialize the object if it's the first log we've found for this ID
            if (!transaction) {
                transaction = { 
                    transactionId,
                    action: action, 
                    history: [],
                    payload: {},
                    lastStatus: null 
                };
            }

            // Add to history trace
            transaction.history.push({ status, timestamp });
            
            // Always update the latest status
            transaction.lastStatus = status;

            // Only overwrite 'action' if the current log has a valid one (not UNKNOWN)
            if (action && action !== 'UNKNOWN') {
                transaction.action = action;
            }

            // Only overwrite 'payload' if the current log has keys (don't overwrite data with empty commit payload)
            const currentPayload = JSON.parse(payloadStr || '{}');
            if (Object.keys(currentPayload).length > 0) {
                transaction.payload = currentPayload;
            }
        } catch (error) {
            console.error(`Corrupt log line: ${line}`, error);
        }
    }

    return transaction;
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

export const redo = async (transactionId, action, payload) => {
    console.log(`[REDO] Re-applying transaction ${transactionId} (${action})`);

    const handler = registry[action];

    if (!handler) {
        console.error(`[REDO] No handler found for action: ${action}`);
        return;
    }

    try {
        await handler.execute(payload);
        console.log(`[REDO] Successfully re-applied ${transactionId}`);
    } catch (error) { // specifically check for duplicate errors        
        const isDuplicate = error.message.includes('Duplicate') || 
                            error.message.includes('already exists') ||
                            error.code === 'ER_DUP_ENTRY';

        if (isDuplicate) {
            console.warn(`[REDO] Skipped ${transactionId}: Data already consistent (Idempotent).`);
        } else {
            console.error(`[REDO] Failed to redo ${transactionId}:`, error.message);
            // In a real system, you might flag this for manual intervention
            throw error; 
        }
    }
}