import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();

export const startTransaction = async (payload) => {
  const transactionId = uuidv4();
  console.log("Starting transaction:", transactionId);

  // FRAGMENTATION LOGIC
  // Dont go to node B
  if (payload.startYear >= 2000) {
    PEER_NODES.filter(nodeURL => !nodeURL.includes('3001'));
  } else if (payload.startYear < 2000) { // Dont go to node C
    PEER_NODES.filter(nodeURL => !nodeURL.includes('3002'));
  }

  // REPLICATION LOGIC
  try {
    const preparePromises = PEER_NODES.map(nodeURL =>
      axios.post(`${nodeURL}/internal/prepare`, { transactionId, data: payload })
    );
    await Promise.all(preparePromises);

    const commitPromises = PEER_NODES.map(nodeURL =>
      axios.post(`${nodeURL}/internal/commit`, { transactionId })
    );

    await Promise.all(commitPromises);

    console.log("Transaction committed successfully:", transactionId);
    return { success: true, transactionId, message: "Replicated to all nodes" };
  } catch (error) {
    console.error("Error during transaction, aborting:", transactionId, error.message);
    const abortPromises = PEER_NODES.map(nodeURL =>
      axios.post(`${nodeURL}/internal/abort`, { transactionId }).catch(err => {
        console.error(`Error aborting transaction on node ${nodeURL}:`, err.message);
      }
    ));
    await Promise.all(abortPromises);
  }
}

// 1st PHASE (VOTING)
export const handlePrepare = async (transactionId, payload) => {
  console.log("Prepare request for: ", transactionId);
  pendingTransactions.set(transactionId, payload);
  return true;
}

// 2nd PHASE (DECISION MAKING)
export const handleCommit = async (transactionId) => {
  console.log("Commit request for: ", transactionId);
  const payload = pendingTransactions.get(transactionId);
  // ADD ROUTE HANDLER HERE, ASSUME PATH IS INCLUDED IN PAYLOAD
  // Middleware for enrichment (appending path as metadata)
  pendingTransactions.delete(transactionId);
  console.log("Transaction committed: ", transactionId);
  return { status: 'COMMITTED' };
}

export const handleAbort = async (transactionId) => {
  console.log("Abort request for: ", transactionId);
  pendingTransactions.delete(transactionId);
  console.log("Transaction aborted: ", transactionId);
  return { status: 'ABORTED' };
}