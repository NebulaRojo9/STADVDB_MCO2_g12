const EventEmitter = require('events');

// Eventually when we have time to implement multimaster mode
class LockManager extends EventEmitter {
  constructor() {
    super();
    // Key: resourceId,
    // Value: { readers: number, writer: boolean, queue: ['SHARED | 'EXCLUSIVE', resolve: function] }
    this.locks = new Map();
  }

  /**
   * Gets or creates locks
   */
  _getLock(resourceId) {
    if (!this.locks.has(resourceId)) {
      this.locks.set(resourceId, {
        readers: 0,
        writer: false,
        queue: []
      });
    }
    return this.locks.get(resourceId);
  }

  /**
   * Recursively process the queue for a resource. Only recurses if the next request is a reader
   */
  _processQueue(resourceId) {
    const lock = this._getLock(resourceId);

    if (lock.queue.length === 0) {
      if (lock.readers === 0 && !lock.writer) {
        this.locks.delete(resourceId);
      }
      return;
    }

    const nextRequest = lock.queue[0];

    if (nextRequest.type === 'EXCLUSIVE') {
      if (lock.readers === 0 && !lock.writer) {
        lock.queue.shift();
        lock.writer = true;
        nextRequest.resolve();
      }
    } else if (nextRequest.type === 'SHARED') {
      // Add reader to lock
      if (!lock.writer) {
        lock.queue.shift();
        lock.readers++;
        nextRequest.resolve();
        
        // Process more readers if queue's head is a reader
        if (lock.queue.length > 0 && lock.queue[0].type === 'SHARED') {
          this._processQueue(resourceId);
        }
      }
    }
  }

  /**
   * Acquire a lock
   */
  acquire(resourceId, type) {
    return new Promise((resolve) => {
      const lock = this._getLock(resourceId);
      
      // Add request to queue
      lock.queue.push({ type, resolve });
      
      // Try to execute immediately
      this._processQueue(resourceId);
    });
  }

  /**
   * Release a lock
   */
  release(resourceId, type) {
    const lock = this.locks.get(resourceId);
    if (!lock) return;

    if (type === 'EXCLUSIVE') {
      lock.writer = false;
    } else {
      lock.readers--;
    }

    this._processQueue(resourceId);
  }
}

module.exports = new LockManager();