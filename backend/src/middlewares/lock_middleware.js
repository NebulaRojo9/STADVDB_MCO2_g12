const lockManager = require('./lock_manager');

/**
 * @param {Function} resourceIdGetter - A function (req) => string to generate the lock key.
 * @param {'SHARED' | 'EXCLUSIVE'} lockType - The type of lock required.
 */
const lockMiddleware = (resourceIdGetter, lockType = 'EXCLUSIVE') => {
  return async (req, res, next) => {
    const resourceId = resourceIdGetter(req);

    if (!resourceId) {
      console.warn('Lock middleware skipped: No resource ID generated.');
      return next();
    }

    try {
      await lockManager.acquire(resourceId, lockType);
      // Mark the lock as held on the request object
      req.lockHeld = { id: resourceId, type: lockType };

      const releaseLock = () => {
        if (req.lockHeld) {
          lockManager.release(req.lockHeld.id, req.lockHeld.type);
          req.lockHeld = null;
        }
      };

      // Hook into Response events to auto-release the lock
      res.on('finish', releaseLock);
      res.on('close', releaseLock);

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = lockMiddleware;