import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import LockManager from '../utils/lock_manager.js';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();
const committedHistory = new Set();

export const startTransaction = async (payload) => {
  const transactionId = uuidv4();
  const timestamp = Date.now();
  console.log("Starting transaction:", transactionId);

  // FRAGMENTATION LOGIC
  let targetNodes = PEER_NODES;
  // Dont go to node B
  if (payload.startYear >= 2000) {
    targetNodes = PEER_NODES.filter(nodeURL => !nodeURL.includes('3001'));
  } else if (payload.startYear < 2000) { // Dont go to node C
    targetNodes = PEER_NODES.filter(nodeURL => !nodeURL.includes('3002'));
  }

  // If no nodes match, return early
  if (targetNodes.length === 0) {
      return { success: false, message: "No nodes available for this shard key" };
  }

  // REPLICATION LOGIC
  try {
    const preparePromises = targetNodes.map(nodeURL =>
      axios.post(`${nodeURL}/internal/prepare`, { transactionId, timestamp, data: payload })
    );
    const prepareResponses = await Promise.all(preparePromises);

    const allVotedYes = prepareResponses.every(res => res.data.vote === 'YES');

    if (!allVotedYes) {
      throw new Error("One or more nodes voted NO");
    }

    const commitPromises = targetNodes.map(nodeURL =>
      axios.post(`${nodeURL}/internal/commit`, { transactionId })
    );

    await Promise.all(commitPromises);

    console.log("Transaction committed successfully:", transactionId);
    return { success: true, transactionId, message: "Replicated to all nodes" };
  } catch (error) {
    console.error("Error during transaction, aborting:", transactionId, error.message);
    
    const abortPromises = targetNodes.map(nodeURL => 
      axios.post(`${nodeURL}/internal/abort`, { transactionId })
        .catch(err => console.error(`Failed to abort on ${nodeURL}`, err.message))
    );
    
    await Promise.all(abortPromises);
    
    return { success: false, error: "Transaction Aborted" };
  }
}

// 1st PHASE (VOTING)
export const handlePrepare = async (transactionId, timestamp, payload) => {
  console.log("Prepare request for: ", transactionId);

  if (committedHistory.has(transactionId)) {
    return { vote: "YES" };
  }

  const resourceId = `tx-${payload.id}`;

  try {
    await LockManager.acquire(resourceId, transactionId, 'EXCLUSIVE', timestamp);
    console.log("Lock acquired for transaction: ", transactionId);

    // TODO: ADD WAL
    pendingTransactions.set(transactionId, {payload, resourceId, timestamp});
    console.log(`[${transactionId}] Vote: YES (Lock Acquired)`);
    return { vote: 'YES' };
  } catch (error) {
    console.error(`[${transactionId}] Vote: NO (Lock Acquisition Failed)`, error.message);
    throw new Error(`CANNOT ACQUIRE LOCK: ${error.message}` );
  }
}

// 2nd PHASE (DECISION MAKING)
// TODO: ADD CHECK FOR MULTIPLE CALLS
export const handleCommit = async (transactionId) => {
  console.log("Commit request for: ", transactionId);

  if (committedHistory.has(transactionId)) {
    return { status: 'COMMITTED_ALREADY' };
  }

  const txState = pendingTransactions.get(transactionId);
  if (!txState) {
    throw new Error(`No pending transaction found for ID: ${transactionId}`);
  }
  const { payload, resourceId } = txState;
  try {
    const stillLocked = LockManager.isLockedBy(resourceId, transactionId);
    if (!stillLocked) {
      throw new Error(`Lock for resource ${resourceId} is no longer held by transaction ${transactionId}`);
    }
    // TODO: ADD ROUTE HANDLER HERE, ASSUME PATH IS INCLUDED IN PAYLOAD
    // Middleware for enrichment (appending path as metadata)
    committedHistory.add(transactionId);
    console.log("Transaction committed: ", transactionId);
    return { status: 'COMMITTED' };
  } catch (e) {
    console.error(`[${transactionId}] Commit Failed`, e.message);
    throw e; // Coordinator needs to know
  } finally {
    if (txState && txState.resourceId) {
      await LockManager.release(txState.resourceId, transactionId);
      console.log("Lock released for transaction: ", transactionId);
    }
    pendingTransactions.delete(transactionId);
  }
}

export const handleAbort = async (transactionId) => {
  console.log("Abort request for: ", transactionId);

  const txState = pendingTransactions.get(transactionId);
  
  if (txState && txState.resourceId) {
    await LockManager.release(txState.resourceId, transactionId);
    console.log("Lock released for transaction: ", transactionId);
  }

  pendingTransactions.delete(transactionId);
  console.log("Transaction aborted: ", transactionId);
  return { status: 'ABORTED' };
}