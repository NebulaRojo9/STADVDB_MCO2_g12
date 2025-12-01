import * as internalService from '../services/internal.service.js';


export async function receivePrepare(req, res) {
  const processTrace = createTrace();
  try {
    const {transactionId, timestamp, data } = req.body
    if (!transactionId || !timestamp || !data) {
      processTrace.log("Missing 2PC headers:", req.body)
      console.error("Missing 2PC headers:", req.body);
      return res.status(400).json({ vote: 'NO', error: "Missing transaction headers", processTrace: processTrace.get()});
    }
    await internalService.handlePrepare(transactionId, timestamp, data, processTrace);
    res.status(200).json({ vote: 'YES', processTrace: processTrace.get() });
  } catch (error) {
    processTrace.log("RECEIVE PREPARE ERROR: ", error)
    console.error("RECEIVE PREPARE ERROR: ", error)
    res.status(500).json({ vote: 'NO', processTrace: processTrace.get(), error: error.message });
  }
}

export async function receiveCommit(req, res) {
  try {
    const result = await internalService.handleCommit(req.body.transactionId);
    res.status(200).json({ status: 'COMMITTED', data: result });
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