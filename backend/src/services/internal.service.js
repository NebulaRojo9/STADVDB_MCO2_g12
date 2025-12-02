import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import lockManager from './lock_manager.js';
import { registry } from './crud_registry.js'
import * as walServices from './wal.service.js'
import 'dotenv/config';
import { createTrace } from '../utils/trace.js';
import { checkTestState } from './test.services.js';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();
const committedHistory = new Set();

const TRANSACTION_TIMEOUT = 10000; // 10 Seconds

const cleanUpExpiredTransactions = async () => {
  const now = Date.now();
  
  for (const [transactionId, tx] of pendingTransactions.entries()) {
    
    if (now - tx.timestamp > TRANSACTION_TIMEOUT) {
      console.warn(`[TIMEOUT] Tx ${transactionId} expired. Aborting...`);
      
      handleAbort(transactionId).catch(err => 
        console.error(`[TIMEOUT] Failed to abort ${transactionId}`, err)
      );
    }
  }
}

const startCleanUpService = async () => {
  console.log("[TRANSACTION CLEAN UP SERVICE STARTED]")

  // Run immediately on start? Optional.
  // await cleanUpExpiredTransactions(); 
  
  setInterval(() => {
    cleanUpExpiredTransactions();
  }, 10 * 1000); 
}

startCleanUpService();

export const getHostNodeUrl = () => {
  return PEER_NODES.find(url => url.includes('3000'));
}

export const isHost = () => {
  return process.env.PORT === '3000'
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

export const startReadTitle = async (id, startYear = undefined, delay = 0) => {
  // No start year specified for read title, but if it is we can skip this part
  if (!startYear) {
    // Check self if record exists
    const localResult = await startTransaction({
      action: 'READ_TITLE',
      id: id,
      startYear: startYear,
      delay: delay
    }, true); 

    if (localResult.success && localResult.data) {
      console.log(`[READ] Found locally on ${process.env.PORT}`);
      return localResult.data;
    }
  }
  // Broadcast to Everyone (or specific node if startYear known)
  const payload = {
    action: 'READ_TITLE',
    id: id,
    startYear: startYear,
    delay: delay
  };

  const result = await startTransaction(payload);
  
  if (!result.success) {
    if (result.message === "Transaction Committed" && !result.data) {
       return null;
    }
    throw new Error(`Read failed: ${result.error || result.message}`);
  }

  return result.data;
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
export const startTransaction = async (payload, isLocal = false) => {
  const transactionId = uuidv4();
  const timestamp = Date.now();
  const processTrace = createTrace()

  // FRAGMENTATION LOGIC
  let targetNodes = PEER_NODES;
  // if current node will also commit
  let isParticipant = true;

  // if local run only
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} started`)
  console.log(`\n\nNEW TRANSACTION\n[TM:${process.env.PORT}] Tx ${transactionId} started`)
  if (isLocal) {
    targetNodes = []
    isParticipant = true;
  }
  // only selects target nodes if we specify a year (CREATE UPDATE DELETE), else broadcast (READ)
  else if (payload.startYear !== undefined && payload.startYear !== null) {
    processTrace.log(`[TM] Tx ${transactionId} specified a year: ${payload.startYear}`)
    console.log(`[TM] Tx ${transactionId} specified a year: ${payload.startYear}`)
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
  }

  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending to peers ${targetNodes}`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending to peers ${targetNodes}`)

  walServices.writeLog(transactionId, payload.action, "PREPARE", payload);
  console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'PREPARE', ${payload}`);
  processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'PREPARE', ${payload}`);

  // REPLICATION LOGIC

  try {
    const preparePromises = targetNodes.map(nodeURL => {
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [PREPARE] to peer ${nodeURL}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [PREPARE] to peer ${nodeURL}`)
      return axios.post(`${nodeURL}/internal/prepare`, { transactionId, timestamp, data: payload })
        .then(res => {
          if (res.data.processTrace && Array.isArray(res.data.processTrace)) {
            processTrace.get().push(...res.data.processTrace);
          }
          return res.data
        })  // get data of response ("YES"|"NO")
    });

    // Inject local operation

    if (isParticipant) {
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [PREPARE] to self ${process.env.PORT}`)
      const localPromise = handlePrepare(transactionId, timestamp, payload)
      .then(res => {
          if (res.processTrace) processTrace.get().push(...res.processTrace);
          return res;
      });
      preparePromises.push(localPromise)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [PREPARE] to self ${process.env.PORT}`)
    }

    // Phase 1: Obtaining a Decision
    const prepareResponses = await Promise.all(preparePromises);
    const failedResponse = prepareResponses.find(res => res.vote === 'NO');
    if (failedResponse) {
      const reason = failedResponse.error || "One or more nodes voted NO";
      
      walServices.writeLog(transactionId, payload.action, "ABORT", { error: reason });
      console.log(`[WAL:${process.env.PORT}] Updated: ${transactionId}, ABORT, ${reason}`);
      
      throw new Error(reason); 
    }

    walServices.writeLog(transactionId, payload.action, "COMMIT", payload);
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'COMMIT', ${payload}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'COMMIT', ${payload}`);

    const commitPromises = targetNodes.map(nodeURL => {
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [COMMIT] to peer ${nodeURL}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [COMMIT] to peer ${nodeURL}`)
      return axios.post(`${nodeURL}/internal/commit`, { transactionId }).then(res => {
        if (res.data.processTrace && Array.isArray(res.data.processTrace)) {
          processTrace.get().push(...res.data.processTrace);
        }
        return res.data
      })
    });

    if (isParticipant) {
      processTrace.log(`[TM:${process.env.PORT}] Calling COMMIT on self`);
      const localPromise = handleCommit(transactionId)
        .then(res => {
          if (res.processTrace) processTrace.get().push(...res.processTrace);
          return res;
        });
      commitPromises.push(localPromise);
    }

    const commitResults = await Promise.all(commitPromises);
    const resultData = commitResults
      .map(res => res.data) // extract data from axios response
      .find(data => data !== null && data !== undefined);
    
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} committed successfully`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} committed successfully`)
    return { success: true, transactionId, data: resultData, message: "Replicated to all nodes", processTrace: processTrace.get()};
  } catch (error) {
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} error occured: ${error.message}`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} error occured: ${error.message}`)
    
    const abortPromises = targetNodes.map(nodeURL => {
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to peer ${nodeURL}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to peer ${nodeURL}`)
      return axios.post(`${nodeURL}/internal/abort`, { transactionId })
        .catch(err => console.error(`Failed to abort on ${nodeURL}`, err.message))
    }
    );

    if (isParticipant) {
      abortPromises.push(handleAbort(transactionId).catch(e => console.error("Local abort failed", e)))
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to self ${process.env.PORT}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to self ${process.env.PORT}`)
    }
    
    await Promise.all(abortPromises);
    
    walServices.writeLog(transactionId, payload.action, "ABORT", {error: " Coordinator Exception "})
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'ABORT', {error: " Coordinator Exception "}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'ABORT', {error: " Coordinator Exception "}`);
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
    return { success: false, error: error.message, processTrace: processTrace.get() };
  }
}

// 1st PHASE (VOTING)
export const handlePrepare = async (transactionId, timestamp, payload) => {
  const processTrace = createTrace();
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [PREPARE]`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [PREPARE]`)

  if (committedHistory.has(transactionId)) {
    return { vote: "YES", processTrace: processTrace.get() };
  }

  const handler = registry[payload.action]
  if (!handler) {
    console.error(`Unknown action type: ${payload.action}`);
    processTrace.log(`Unknown action type: ${payload.action}`);
    return { vote: "NO", error: "Unknown action type"};
  }

  const resourceId = `tx-${payload.id}`;

  const lockType = handler.lockType || 'EXCLUSIVE';

  try {
    await lockManager.acquire(resourceId, transactionId, lockType, timestamp);
    processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock acquired`)
    console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock acquired`)
  } catch (error) {
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Lock Acquisition Failed)`, error.message);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Lock Acquisition Failed)`, error.message);
    return { vote: "NO", error: error.message, processTrace: processTrace.get()}
  }
  try {
    walServices.writeLog(transactionId, payload.action, "READY", payload); // site promises it can commit if asked
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'READY', ${payload}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'READY', ${payload}`);

    await handler.validate(payload);

    pendingTransactions.set(transactionId, {payload, resourceId, timestamp});
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: YES (Lock Acquired)`);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: YES (Lock Acquired)`);

    return { vote: 'YES', processTrace: processTrace.get() };
  } catch (error) {
    // Recovery???
    walServices.writeLog(transactionId, payload.action, "ABORT", { error: error.message })
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'ABORT', error: ${error.message}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${payload.action}, 'ABORT', error: ${error.message}`);
    lockManager.release(resourceId, transactionId)
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
    return { vote: "NO", error: error.message, processTrace: processTrace.get() }
  }
}

// 2nd PHASE (DECISION MAKING)
// TODO: ADD CHECK FOR MULTIPLE CALLS
export const handleCommit = async (transactionId) => {
  const processTrace = createTrace();

  if (committedHistory.has(transactionId)) {
    return { status: 'COMMITTED_ALREADY', processTrace: processTrace.get()};
  }

  const txState = pendingTransactions.get(transactionId);
  let action = "UNKNOWN";
  if (txState) {
    action = txState.payload.action
    walServices.writeLog(transactionId, action, "COMMIT", txState.payload);
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${action}, "COMMIT", ${txState.payload}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${action}, "COMMIT", ${txState.payload}`);
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [COMMIT]`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [COMMIT]`)
  } else {
    processTrace.log(`No pending transaction found for ID: ${transactionId}`);
    console.error(`No pending transaction found for ID: ${transactionId}`);
    // We log an error to WAL, but we can't log the specific action or payload
    walServices.writeLog(transactionId, "UNKNOWN", "COMMIT_ERROR", { error: "No pending transaction found" });
    
    return { status: "ERROR", processTrace: processTrace.get()}
  }
  const { payload, resourceId } = txState;
  try {
    const stillLocked = lockManager.isLockedBy(resourceId, transactionId);
    if (!stillLocked) {
      processTrace.log(`Lock for resource ${resourceId} is no longer held by transaction ${transactionId}`);
      console.error(`Lock for resource ${resourceId} is no longer held by transaction ${transactionId}`);
      return { status: "ERROR", processTrace: processTrace.get()}
    }

    const handler = registry[payload.action]
    const result = await handler.execute(payload)
    
    // Clean up
    setTimeout(() => {
        committedHistory.delete(transactionId);
    }, 10 * 60 * 1000); // 600,000 ms

    committedHistory.add(transactionId);
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} committed successfully`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} committed successfully`)
    return { status: 'COMMITTED', data: result, processTrace: processTrace.get()};
  } catch (e) {
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} commit failed`, e.message)
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} commit failed`, e.message)
    return { status: 'ERROR', processTrace: processTrace.get()};
  } finally {
    if (txState && txState.resourceId) {
      await lockManager.release(txState.resourceId, transactionId);
      processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
      console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
    }
    pendingTransactions.delete(transactionId);
  }
}

export const handleAbort = async (transactionId) => {
  const processTrace = createTrace();

  const txState = pendingTransactions.get(transactionId);
  let action = "UNKNOWN"
  if (txState && txState.resourceId) {
    action = txState.payload.action
    walServices.writeLog(transactionId, action, "ABORT", txState.payload);
    console.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${action}, "ABORT", ${txState.payload}`);
    processTrace.log(`[WAL:${process.env.PORT}] LOG Updated: ${transactionId}, ${action}, "ABORT", ${txState.payload}`);
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [ABORT]`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [ABORT]`)
    await lockManager.release(txState.resourceId, transactionId);
    processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
    console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
  }

  pendingTransactions.delete(transactionId);
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
  return { status: 'ABORTED', processTrace: processTrace.get() };
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