import express from 'express';
import lockManager from './middlewares/lock_manager.js';

const app = express();
app.use(express.json());

// Global listener for visibility during tests
lockManager.on('abort', (txId) => {
  console.log(`[LockManager EVENT] abort -> transaction=${txId}`);
});


// Direct acquire: uses provided headers to control timestamp and lock type.
app.post('/direct/:id/acquire', async (req, res) => {
  const resourceId = req.params.id;
  const transactionId = req.headers['x-transaction-id'] || `tx-${Date.now()}`;
  const tsHeader = req.headers['x-timestamp'];
  const timestamp = tsHeader ? Number(tsHeader) : Date.now();
  const lockType = (req.headers['x-lock-type'] || 'EXCLUSIVE').toUpperCase();

  console.log(`[REQ] acquire start resource=${resourceId} tx=${transactionId} type=${lockType} ts=${timestamp}`);

  try {
    await lockManager.acquire(resourceId, transactionId, lockType, timestamp);
    console.log(`[OK] acquired resource=${resourceId} tx=${transactionId} type=${lockType}`);
    return res.status(200).json({ acquired: true, resourceId, transactionId, lockType, timestamp });
  } catch (err) {
    console.warn(`[ERR] acquire failed resource=${resourceId} tx=${transactionId} err=${err.message}`);
    if (err.message && err.message.includes('aborted')) {
      return res.status(409).json({ error: 'Transaction aborted', message: err.message });
    }
    if (err.message && err.message.includes('timed out')) {
      return res.status(503).json({ error: 'timed out', message: err.message });
    }
    return res.status(500).json({ error: 'acquire failed', message: err.message });
  }
});

// Long-acquire: acquire then hold for X ms (header `x-hold-ms`) or until aborted.
app.post('/direct/:id/long-acquire', async (req, res) => {
  const resourceId = req.params.id;
  const transactionId = req.headers['x-transaction-id'] || `tx-${Date.now()}`;
  const tsHeader = req.headers['x-timestamp'];
  const timestamp = tsHeader ? Number(tsHeader) : Date.now();
  const lockType = (req.headers['x-lock-type'] || 'EXCLUSIVE').toUpperCase();
  const holdMs = Number(req.headers['x-hold-ms'] || 5000);

  let holdTimer = null;
  const onAbort = (id) => {
    if (id === transactionId) {
      // release local state and respond if still pending
      console.log(`[EVENT] onAbort for resource=${resourceId} tx=${transactionId}`);
      try { lockManager.release(resourceId, transactionId); } catch (e) {}
      if (!res.headersSent) {
        res.status(409).json({ error: 'Transaction aborted (wounded while executing)' });
      }
      if (holdTimer) clearTimeout(holdTimer);
    }
  };

  lockManager.on('abort', onAbort);

  try {
    await lockManager.acquire(resourceId, transactionId, lockType, timestamp);
    console.log(`[OK] long-acquire acquired resource=${resourceId} tx=${transactionId} holding ${holdMs}ms`);

    // acquired — hold for holdMs then release & respond
    holdTimer = setTimeout(() => {
      console.log(`[RELEASE] timed release resource=${resourceId} tx=${transactionId}`);
      lockManager.release(resourceId, transactionId);
      lockManager.off('abort', onAbort);
      if (!res.headersSent) {
        res.status(200).json({ released: true, resourceId, transactionId });
      }
    }, holdMs);

    // Keep the response open until released or aborted
  } catch (err) {
    lockManager.off('abort', onAbort);
    if (err.message && err.message.includes('aborted')) {
      return res.status(409).json({ error: 'Transaction aborted', message: err.message });
    }
    if (err.message && err.message.includes('timed out')) {
      return res.status(503).json({ error: 'timed out', message: err.message });
    }
    return res.status(500).json({ error: 'acquire failed', message: err.message });
  }
});

app.post('/direct/:id/release', (req, res) => {
  const resourceId = req.params.id;
  const transactionId = req.headers['x-transaction-id'];
  if (!transactionId) return res.status(400).json({ error: 'missing x-transaction-id header' });
  console.log(`[REQ] release resource=${resourceId} tx=${transactionId}`);
  lockManager.release(resourceId, transactionId);
  return res.status(200).json({ released: true, resourceId, transactionId });
});

const port = process.env.LOCK_TEST_PORT || 4000;
app.listen(port, () => console.log(`Lock test server running at http://localhost:${port}`));
