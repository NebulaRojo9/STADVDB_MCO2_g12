import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const PEER_NODES = process.env.PEERS ? process.env.PEERS.split(',') : [];

const pendingTransactions = new Map();

export const startTransaction = async (payload) => {
  const transactionId = uuidv4();
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
      axios.post(`${nodeURL}/internal/prepare`, { transactionId, data: payload })
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
// TODO: ADD WAL
export const handlePrepare = async (transactionId, payload) => {
  console.log("Prepare request for: ", transactionId);
  pendingTransactions.set(transactionId, payload);
  return true;
}

// 2nd PHASE (DECISION MAKING)
// TODO: ADD CHECK FOR MULTIPLE CALLS
export const handleCommit = async (transactionId) => {
  console.log("Commit request for: ", transactionId);
  const payload = pendingTransactions.get(transactionId);
  // TODO: ADD ROUTE HANDLER HERE, ASSUME PATH IS INCLUDED IN PAYLOAD
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