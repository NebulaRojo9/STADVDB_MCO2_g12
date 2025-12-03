import * as internalService from '../services/internal.service.js';
import { getTransactionLog } from '../services/wal.service.js';

export async function receivePrepare(req, res) {
  try {
    const { transactionId, timestamp, data } = req.body;
    if (!transactionId || !timestamp || !data) {
      return res
        .status(400)
        .json({
          vote: 'NO',
          error: 'Missing transaction headers',
          processTrace: processTrace.get(),
        });
    }
    const result = await internalService.handlePrepare(transactionId, timestamp, data);
    res.status(200).json(result);
  } catch (error) {
    console.error("RECEIVE PREPARE CRITICAL ERROR: ", error);
    res.status(500).json({ 
      vote: 'NO', 
      error: `Internal Node Crash: ${error.message}` 
    });
  }
}

export async function receiveCommit(req, res) {
  try {
    const { transactionId, payload } = req.body;

    const result = await internalService.handleCommit(transactionId, payload);

    res.status(200).json(result);
  } catch (error) {
    console.error('RECEIVE COMMIT ERROR: ', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
}

export async function receiveAbort(req, res) {
  try {
    const result = await internalService.handleAbort(req.body.transactionId);
    res.status(200).json(result);
  } catch (error) {
    console.error('RECEIVE ABORT ERROR: ', error);
    res.status(500).json({
      status: 'FAILED TO ABORT',
      error: error.message
    });
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
