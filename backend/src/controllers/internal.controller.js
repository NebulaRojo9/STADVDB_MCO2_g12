import * as internalService from '../services/internal.service.js';

export const clientRequest = async (req, res) => {

}

export async function receivePrepare(req, res) {
  try {
    await internalService.handlePrepare(req.body.transactionId, req.body.data);
    res.status(200).json({ vote: 'YES' });
  } catch (error) {
    res.status(500).json({ vote: 'NO', error: error.message });
  }
}

export async function receiveCommit(req, res) {
  try {
    await internalService.handleCommit(req.body.transactionId);
    res.status(200).json({ status: 'COMMITTED' });
  } catch (error) {
    res.status(500).json({ status: 'FAILED TO COMMIT', error: error.message });
  }
}

export async function receiveAbort(req, res) {
  try {
    await internalService.handleAbort(req.body.transactionId);
    res.status(200).json({ status: 'ABORTED' });
  } catch (error) {
    res.status(500).json({ status: 'FAILED TO ABORT', error: error.message });
  }
}