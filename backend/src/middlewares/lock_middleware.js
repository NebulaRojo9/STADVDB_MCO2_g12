import { v4 as uuidv4 } from 'uuid';
import lockManager from './lock_manager';

const lockMiddleware = (resourceIdGetter, options = {}) => {
  const { timeout = 5000 } = options;

  return async (req, res, next) => {
    const resourceId = resourceIdGetter(req);

    if (!resourceId) return next();

    // 1. Prepare Metadata
    const transactionId = req.headers['x-transaction-id'] || uuidv4();
    const lockType = (req.method === 'GET' || req.method === 'HEAD') ? 'SHARED' : 'EXCLUSIVE';
    
    req.transactionId = transactionId;
    req.lockType = lockType;

    // 2. Define Release Mechanism
    let released = false;
    const releaseLock = () => {
      if (!released) {
        lockManager.release(resourceId, transactionId);
        released = true;
      }
    };

    // 3. Define Runtime Abort Handler
    // This function runs if we get wounded WHILE doing work
      const onRuntimeAbort = (id) => {
        if (id === transactionId) {
          console.warn(`[LockManager] Aborting active transaction ${transactionId}`);
          releaseLock(); 
        
          // If we are mid-stream, we must destroy the connection to stop the client
          if (res.headersSent) {
            res.destroy(); 
          }
        }
      };
    
      // Note: we rely on the acquire() promise to reject when the transaction
      // is wounded (lockManager will call the request's reject). The runtime
      // abort handler below handles the case where a transaction is wounded
      // while already executing (it will release and, if the response has
      // started, destroy the connection).

    try {
      // 4. Acquire Lock (Wait Phase)
      await lockManager.acquire(resourceId, transactionId, lockType, Date.now(), timeout);

      // 5. Start Listening for Wounds (Execution Phase)
      lockManager.on('abort', onRuntimeAbort);

      // 6. Cleanup Hooks
      const cleanup = () => {
        lockManager.off('abort', onRuntimeAbort); // Stop listening
        releaseLock();
      };

      res.on('finish', cleanup);
      res.on('close', cleanup);

      next();

    } catch (err) {
      releaseLock();

      if (err.message.includes('aborted')) {
        return res.status(409).json({ error: 'Transaction aborted due to conflict.' });
      }
      
      if (err.message.includes('timed out')) {
        return res.status(503).json({ error: 'Resource is busy. Please try again later.' });
      }

      next(err);
    }
  };
};

module.exports = lockMiddleware;