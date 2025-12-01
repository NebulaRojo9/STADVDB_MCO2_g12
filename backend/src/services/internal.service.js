import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import lockManager from './lock_manager.js';
import { registry } from './crud_registry.js'
import 'dotenv/config';
import { createTrace } from '../utils/trace.js';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();
const committedHistory = new Set();

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

export const startReadTitle = async (id, startYear = undefined) => {
  // No start year specified for read title, but if it is we can skip this part
  if (!startYear) {
    // Check self if record exists
    const localResult = await startTransaction({
      action: 'READ_TITLE',
      id: id,
      startYear: startYear 
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
    startYear: startYear
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
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} started`)
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
      preparePromises.push(handlePrepare(transactionId, timestamp, payload, processTrace))
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [PREPARE] to self ${process.env.PORT}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [PREPARE] to self ${process.env.PORT}`)
    }

    const prepareResponses = await Promise.all(preparePromises);

    const allVotedYes = prepareResponses.every(res => res.vote === 'YES');

    if (!allVotedYes) {
      throw new Error("One or more nodes voted NO");
    }

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
      commitPromises.push(handleCommit(transactionId, processTrace))
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [COMMIT] to self ${process.env.PORT}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} calling [COMMIT] to self ${process.env.PORT}`)
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
      abortPromises.push(handleAbort(transactionId, processTrace).catch(e => console.error("Local abort failed", e)))
      processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to self ${process.env.PORT}`)
      console.log(`[TM:${process.env.PORT}] Tx ${transactionId} sending [ABORT] to self ${process.env.PORT}`)
    }
    
    await Promise.all(abortPromises);
    
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
    console.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
    return { success: false, error: "Transaction Aborted", processTrace: processTrace.get() };
  }
}

// 1st PHASE (VOTING)
export const handlePrepare = async (transactionId, timestamp, payload, processTrace) => {
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [PREPARE]`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [PREPARE]`)

  if (committedHistory.has(transactionId)) {
    return { vote: "YES" };
  }

  const handler = registry[payload.action]
  if (!handler) throw new Error(`Unknown action type: ${payload.action}`);

  const resourceId = `tx-${payload.id}`;

  const lockType = handler.lockType || 'EXCLUSIVE';

  try {
    await lockManager.acquire(resourceId, transactionId, lockType, timestamp);
    processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock acquired`)
    console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock acquired`)
  } catch (error) {
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Lock Acquisition Failed)`, error.message);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Lock Acquisition Failed)`, error.message);
    throw new Error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
  }
  try {
    // TODO: ADD WAL
    await handler.validate(payload);

    pendingTransactions.set(transactionId, {payload, resourceId, timestamp});
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: YES (Lock Acquired)`);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: YES (Lock Acquired)`);

    return { vote: 'YES', processTrace: processTrace.get() };
  } catch (error) {
    lockManager.release(resourceId, transactionId)
    processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
    console.error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
    throw new Error(`[TM:${process.env.PORT}] Tx ${transactionId} Vote: NO (Validation Failed)`, error.message);
  }
}

// 2nd PHASE (DECISION MAKING)
// TODO: ADD CHECK FOR MULTIPLE CALLS
export const handleCommit = async (transactionId, processTrace) => {
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [COMMIT]`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [COMMIT]`)


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
    throw e; // Coordinator needs to know
  } finally {
    if (txState && txState.resourceId) {
      await lockManager.release(txState.resourceId, transactionId);
      processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
      console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
    }
    pendingTransactions.delete(transactionId);
  }
}

export const handleAbort = async (transactionId, processTrace) => {
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [ABORT]`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} received [ABORT]`)

  const txState = pendingTransactions.get(transactionId);
  
  if (txState && txState.resourceId) {
    await lockManager.release(txState.resourceId, transactionId);
    processTrace.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
    console.log(`[LM:${process.env.PORT}] Tx ${transactionId} lock released`)
  }

  pendingTransactions.delete(transactionId);
  processTrace.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
  console.log(`[TM:${process.env.PORT}] Tx ${transactionId} aborted successfully`)
  return { status: 'ABORTED', processTrace: processTrace.get() };
}