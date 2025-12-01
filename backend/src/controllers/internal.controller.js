import * as internalService from '../services/internal.service.js';

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
    const result = await internalService.handleCommit(req.body.transactionId);
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
    result = await internalService.handleAbort(req.body.transactionId);
    res.status(200).json(result);
  } catch (error) {
    console.error('RECEIVE ABORT ERROR: ', error);
    res.status(500).json({
      status: 'FAILED TO ABORT',
      error: error.message
    });
  }
}
