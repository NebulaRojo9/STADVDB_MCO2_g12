import * as internalService from '../services/internal.service.js';

export const clientRequest = async (req, res) => {

}

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