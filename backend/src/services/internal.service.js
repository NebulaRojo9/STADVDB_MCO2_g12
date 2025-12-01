import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import lockManager from './lock_manager.js';
import { registry } from './crud_registry.js'
import * as walServices from './wal.service.js'
import 'dotenv/config';
import { setTimeout as sleep } from 'timers/promises';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();
const committedHistory = new Set();

export const getHostNodeUrl = () => {
  return PEER_NODES.find(url => url.includes('3000'));
}

export const isHost = () => {
  return process.env.PORT === '3000'
}

export const broadcastReadRow = async (id) => {
  console.log(`[READ] Broadcasting read request for ${id} to peers`);

  for (const peerUrl of PEER_NODES) {
    try {
      const response = await axios.get(`${peerUrl}/title-basics/read/${id}`)

      if (response.status === 200) {
        console.log(`[READ] Found ${id} on peer ${peerUrl}`);
        return response.data
      }
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        console.error(`[READ] Peer ${peerUrl} error:`, err.message)
      }
    }
  }

  return null;
}

export const aggregateAllTitlesFromPeers = async (hostURL) => {
  if (!hostURL) return [];

  try {
      const response = await axios.get(`${hostURL}/title-basics/readAll`);
      return response.data
    } catch (err) {
      console.error(`Failed to fetch data from peer ${hostURL}:`, err.message)
      return [];
    }
}

export const broadcastResetDatabases = async () => {
  console.log(`Broadcasting reset database request to peers`);

  for (const peerUrl of PEER_NODES) {
    try {
      const response = await axios.delete(`${peerUrl}/title-basics/resetDatabases`)
      console.log(response)

      if (response.status === 200) {
        return response.data
      }
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        console.error(`[DELETE] Peer ${peerUrl} error:`, err.message)
      }
    }
  }

  return null;
}

/**
 * 
 * @param {*} payload 
 * {
 *  action: ACTION_IN_REGISTRY
 *  id: resource to modify
 *  data: req.body
 * }
 */
export const startTransaction = async (payload) => {
  const transactionId = uuidv4();
  const timestamp = Date.now();
  console.log("Starting transaction:", transactionId);

  // FRAGMENTATION LOGIC
  let targetNodes = PEER_NODES;
  // if current node will also commit
  let isParticipant = true;
  // Dont go to node B
  if (payload.startYear >= 2000) {
    targetNodes = PEER_NODES.filter(nodeURL => !nodeURL.includes('3001'));
    if (process.env.PORT == '3001') {
      isParticipant = false;
    }
  } else if (payload.startYear < 2000) { // Dont go to node C
    targetNodes = PEER_NODES.filter(nodeURL => !nodeURL.includes('3002'));
    if (process.env.PORT == '3002') {
      isParticipant = false;
    }
  }
  // No peers and not a participant
  if (targetNodes.length === 0 && !isParticipant) {
      return { success: false, message: "No nodes available for this shard key" };
  }

  walServices.writeLog(transactionId, payload.action, "PREPARE", payload);

  // REPLICATION LOGIC

  try {
    const preparePromises = targetNodes.map(nodeURL =>
      axios.post(`${nodeURL}/internal/prepare`, { transactionId, timestamp, data: payload })
        .then(res => res.data)  // get data of response ("YES"|"NO")
    );

    // Inject local operation

    if (isParticipant) {
      preparePromises.push(
        handlePrepare(transactionId, timestamp, payload)
      )
    }

    // Phase 1: Obtaining a Decision
    const prepareResponses = await Promise.all(preparePromises);

    const allVotedYes = prepareResponses.every(res => res.vote === 'YES');

    // Since transaction manager decided that we can't proceed, send a no to log from Ci
    if (!allVotedYes) {
      walServices.writeLog(transactionId, payload.action, "ABORT", {error: "Not all nodes said yes"})
      throw new Error("One or more nodes voted NO");
    }

    walServices.writeLog(transactionId, payload.action, "COMMIT", payload);


    const commitPromises = targetNodes.map(nodeURL =>
      axios.post(`${nodeURL}/internal/commit`, { transactionId })
    );

    if (isParticipant) {
      commitPromises.push(handleCommit(transactionId))
    }

    await Promise.all(commitPromises);
    console.log("Transaction committed successfully:", transactionId);
    return { success: true, transactionId, message: "Replicated to all nodes" };
  } catch (error) {
    console.error("Error during transaction, aborting:", transactionId, error.message);
    
    const abortPromises = targetNodes.map(nodeURL => 
      axios.post(`${nodeURL}/internal/abort`, { transactionId })
        .catch(err => console.error(`Failed to abort on ${nodeURL}`, err.message))
    );

    if (isParticipant) {
      abortPromises.push(
        handleAbort(transactionId).catch(e => console.error("Local abort failed", e))
      )
    }
    
    await Promise.all(abortPromises);
    
    walServices.writeLog(transactionId, payload.action, "ABORT", {error: " Coordinator Exception "})
    return { success: false, error: "Transaction Aborted" };
  }
}

// 1st PHASE (VOTING)
export const handlePrepare = async (transactionId, timestamp, payload) => {  
  if (committedHistory.has(transactionId)) {
    return { vote: "YES" };
  }

  const handler = registry[payload.action]
  if (!handler) throw new Error(`Unknown action type: ${payload.action}`);

  const resourceId = `tx-${payload.id}`;

  try {
    await lockManager.acquire(resourceId, transactionId, 'EXCLUSIVE', timestamp);
    console.log("Lock acquired for transaction: ", transactionId);
  } catch (error) {
    console.error(`[${transactionId}] Vote: NO (Lock Acquisition Failed)`, error.message);
    throw new Error(`CANNOT ACQUIRE LOCK: ${error.message}` );
  }
  try {
    walServices.writeLog(transactionId, payload.action, "READY", payload); // site promises it can commit if asked

    await handler.validate(payload);

    pendingTransactions.set(transactionId, {payload, resourceId, timestamp});
    console.log(`[${transactionId}] PORT[${process.env.PORT}] Vote: YES (Lock Acquired)`);
    console.log("HEREEE");
    return { vote: 'YES' };
  } catch (error) {
    // Recovery???
    walServices.writeLog(transactionId, payload.action, "ABORT", { error: error.message })
    lockManager.release(resourceId, transactionId)
    console.error(`[${transactionId}] PORT[${process.env.PORT}] Vote: NO (Validation Failed)`, error.message);
    throw new Error(`VALIDATION FAILED: ${error.message}`);
  }
}

// 2nd PHASE (DECISION MAKING)
// TODO: ADD CHECK FOR MULTIPLE CALLS
export const handleCommit = async (transactionId) => {
  console.log("Commit request for: ", transactionId);
  walServices.writeLog(transactionId, "UNKNOWN", "COMMIT", {});

  if (committedHistory.has(transactionId)) {
    return { status: 'COMMITTED_ALREADY' };
  }

  const txState = pendingTransactions.get(transactionId);
  if (!txState) {
    throw new Error(`No pending transaction found for ID: ${transactionId}`);
  }
  const { payload, resourceId } = txState;
  try {
    const stillLocked = lockManager.isLockedBy(resourceId, transactionId);
    if (!stillLocked) {
      throw new Error(`Lock for resource ${resourceId} is no longer held by transaction ${transactionId}`);
    } //

    // TODO: ADD ROUTE HANDLER HERE, ASSUME PATH IS INCLUDED IN PAYLOAD
    // Middleware for enrichment (appending path as metadata)

    const handler = registry[payload.action]
    await handler.execute(payload)
    
    // Clean up
    setTimeout(() => {
        committedHistory.delete(transactionId);
    }, 10 * 60 * 1000); // 600,000 ms

    committedHistory.add(transactionId);
    console.log("Transaction committed: ", transactionId);
    return { status: 'COMMITTED' };
  } catch (e) {
    console.error(`[${transactionId}] Commit Failed`, e.message);
    throw e; // Coordinator needs to know
  } finally {
    if (txState && txState.resourceId) {
      await lockManager.release(txState.resourceId, transactionId);
      console.log("Lock released for transaction: ", transactionId);
    }
    pendingTransactions.delete(transactionId);
  }
}

export const handleAbort = async (transactionId) => {
  console.log("Abort request for: ", transactionId);
  walServices.writeLog(transactionId, 'UNKNOWN', 'ABORT', {});

  const transactionState = pendingTransactions.get(transactionId);
  
  if (transactionState && transactionState.resourceId) {
    await lockManager.release(transactionState.resourceId, transactionId);
    console.log("Lock released for transaction: ", transactionId);
  }

  pendingTransactions.delete(transactionId);
  console.log("Transaction aborted: ", transactionId);
  return { status: 'ABORTED' };
}

export const performRecovery = async () => {
  console.log("Checking log file for recovery");

  const transactions = await walServices.recoverFromLogs();
  let recoveryCount = 0;

  for (const [transactionId, data] of transactions) {
    const { lastStatus, action, payload } = data; 

    // Options for last status:
    // Prepare
    // Ready
    // Commit/Abort

    if (lastStatus === 'PREPARE') { // abort abort abort
      console.warn(`[RECOVERY] Found orphaned transaction ${transactionId} (Action: ${action}). Rolling back.`);

      walServices.writeLog(transactionId, action, "ABORT", { reason: 'Crash Recovery' });
      recoveryCount++;
    } else if (lastStatus === 'READY') { // unsure, so check other nodes
      console.warn(`[RECOVERY] Found orphaned but ready transaction ${transactionId}. Checking other nodes' status...`)
      const decision = await walServices.askPeersForDecision(transactionId, PEER_NODES);
      
      // console.log(decision);
      if (decision === 'COMMIT') {
        console.log(`[RECOVERY] Peers say COMMIT. Committing ${transactionId}`);
        walServices.writeLog(transactionId, action, "COMMIT", { reason: 'Crash Recovery '});
        walServices.redo(transactionId, action, payload);
      } else {
        console.log(`[RECOVERY] At least 1 ABORTED. Aborting ${transactionId}`);
        walServices.writeLog(transactionId, action, "ABORT", { reason: 'Crash Recovery '})
      }
    } else if (lastStatus === 'COMMIT') { // redo transaction if it is a commit
      console.log(`[RECOVERY] Found committed transaction ${transactionId} (Action: ${action}). Comitting...`)
      walServices.redo(transactionId, action, payload)
    } else {
      console.warn(`[RECOVERY] Found aborted transaction ${transactionId} (Action: ${action}). Rolling back.`);
    }
  }

  if (recoveryCount > 0) {
    console.log(`[WAL] Recovery complete, Rolled back ${recoveryCount} unfinished transactions`);
  } else {
    console.log(`[WAL] No unfinished transactions found`);
  }
}