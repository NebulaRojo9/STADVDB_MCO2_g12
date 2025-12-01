import * as internalService from '../services/internal.service.js';
import { getTransactionLog } from '../services/wal.service.js';

export async function receivePrepare(req, res) {
  try {
    const {transactionId, timestamp, data } = req.body
    if (!transactionId || !timestamp || !data) {
      console.error("Missing 2PC headers:", req.body);
      return res.status(400).json({ vote: 'NO', error: "Missing transaction headers" });
    }
    await internalService.handlePrepare(transactionId, timestamp, data);
    res.status(200).json({ vote: 'YES' });
  } catch (error) {
    console.error("RECEIVE PREPARE ERROR: ", error)
    res.status(500).json({ vote: 'NO', error: error.message });
  }
}

export async function receiveCommit(req, res) {
  try {
    await internalService.handleCommit(req.body.transactionId);
    res.status(200).json({ status: 'COMMITTED' });
  } catch (error) {
    console.error("RECEIVE COMMIT ERROR: ", error)
    res.status(500).json({ status: 'FAILED TO COMMIT', error: error.message });
  }
}

export async function receiveAbort(req, res) {
  try {
    await internalService.handleAbort(req.body.transactionId);
    res.status(200).json({ status: 'ABORTED' });
  } catch (error) {
    console.error("RECEIVE ABORT ERROR: ", error)
    res.status(500).json({ status: 'FAILED TO ABORT', error: error.message });
  }
}

export const checkTransactionStatus = async (req, res) => {
  // console.log("skibidy")
  const { id } = req.params;

  console.log(`[DEBUG] Searching logs for ID: '${id}'`);

  // Read local logs
  const history = await getTransactionLog(id)

  if (!history) {
    // Perhaps crashed before other codes could run prepare
    return res.json({ status: 'UNKNOWN' })
  }

  const lastState = history.lastStatus;
  return res.json({ status: lastState, details: history })
}

export async function checkLastLog(req, res) {
  try {
    const lastLog = await internalService.getLastLogEntry();
    res.status(200).json(lastLog);
  } catch (error) {
    console.error("CHECK LAST LOG ERROR: ", error);
    res.status(500).json({ status: 'FAILED TO CHECK LAST LOG', error: error.message })
  }
}