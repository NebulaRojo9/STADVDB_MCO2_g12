import { EventEmitter } from 'events';

class Queue {
  constructor() {
    this.items = [];
  }
  enqueue(item) {
    this.items.push(item);
  }
  dequeue() {
    return this.isEmpty() ? null : this.items.shift();
  }
  peek() {
    return this.isEmpty() ? null : this.items[0];
  }
  isEmpty() {
    return this.items.length === 0;
  }
  size() {
    return this.items.length;
  }
}

class LockManager extends EventEmitter {
  constructor() {
    super();
    this.resource_locks = new Map();
  }

  // Enable verbose debug output by setting environment variable
  static get DEBUG() {
    return !!process.env.LOCK_MANAGER_DEBUG;
  }

  _getLockState(resourceId) {
    if (!this.resource_locks.has(resourceId)) {
      this.resource_locks.set(resourceId, {
        active_locks: [],
        pending_locks: new Queue(),
      });
    }
    return this.resource_locks.get(resourceId);
  }

  _woundLock(resourceId, activeLock) {
    if (LockManager.DEBUG) console.log(`[LockManager] wound: resource=${resourceId} woundedTx=${activeLock.transactionId}`);

    // Notify listeners that this lock is being aborted
    this.emit('abort', activeLock.transactionId);

    // Reject promise to avoid hanging
    if (activeLock.reject) {
      activeLock.reject(new Error(`Transaction ${activeLock.transactionId} aborted by Wound-Wait`));
    }

    this.release(resourceId, activeLock.transactionId);
  }

  _tryGrant(state, lockRequest) {
    // 1. FAIRNESS CHECK (no jumping the queue)
    if (!state.pending_locks.isEmpty()) {
      const head = state.pending_locks.peek();
      if (head.transactionId !== lockRequest.transactionId) {
        if (LockManager.DEBUG) console.log(`[LockManager] cannot grant: pending head=${head.transactionId} requester=${lockRequest.transactionId}`);
        return false;
      }
    }

    // 2. CONFLICT CHECK
    const hasConflict = state.active_locks.some((active) => {
      if (active.transactionId === lockRequest.transactionId) return false;
      return lockRequest.type === 'EXCLUSIVE' || active.type === 'EXCLUSIVE';
    });

    if (!hasConflict) {
      state.active_locks.push(lockRequest);
      if (LockManager.DEBUG) console.log(`[LockManager] granted: resource=${lockRequest.resourceId} tx=${lockRequest.transactionId} type=${lockRequest.type}`);
      if (lockRequest.resolve) lockRequest.resolve(true);
      return true;
    }
    return false;
  }

  acquire(resourceId, transactionId, type, timestamp) {
    return new Promise((resolve, reject) => {
      const lockRequest = { resourceId, transactionId, timestamp, type, resolve, reject };
      const state = this._getLockState(resourceId);

      // RETRY LOOP
      while (true) {
        const conflicts = state.active_locks.filter((active) => {
          if (active.transactionId === transactionId) return false;
          return type === 'EXCLUSIVE' || active.type === 'EXCLUSIVE';
        });

        // NO CONFLICTS
        if (conflicts.length === 0) {
          if (this._tryGrant(state, lockRequest)) return;
          break; // Start waiting (blocked by fairness queue)
        }

        // CHECK WOUND-WAIT CONDITIONS
        const incomingIsYounger = conflicts.some((c) => c.timestamp < timestamp);
        if (incomingIsYounger) {
          break; // Wait (younger transaction must wait)
        }

        // ELSE WE ARE OLDER - WOUND CONFLICTS
        conflicts.forEach((transaction) => {
          this._woundLock(resourceId, transaction);
        });

        // LOOP UNTIL LOCK IS GRANTED OR WAITING
      }

      if (LockManager.DEBUG) console.log(`[LockManager] enqueue: resource=${resourceId} tx=${transactionId} type=${type} ts=${timestamp}`);
      state.pending_locks.enqueue(lockRequest);
    });
  }

  release(resourceId, transactionId) {
    const state = this.resource_locks.get(resourceId);
    if (!state) return;

    // Remove from active locks
    state.active_locks = state.active_locks.filter((l) => l.transactionId !== transactionId);

    // Remove from pending locks (Clean up if user manually released while waiting)
    state.pending_locks.items = state.pending_locks.items.filter(
      (l) => l.transactionId !== transactionId,
    );

    // Sort pending locks by timestamp to maintain order
    state.pending_locks.items.sort((a, b) => a.timestamp - b.timestamp);

    // Grant locks to pending requests if possible
    while (!state.pending_locks.isEmpty()) {
      const nextRequest = state.pending_locks.peek();
      if (this._tryGrant(state, nextRequest)) {
        state.pending_locks.dequeue();
      } else {
        break;
      }
    }

    // Clean up if no locks remain
    if (state.active_locks.length === 0 && state.pending_locks.isEmpty()) {
      this.resource_locks.delete(resourceId);
    }
  }

  isLockedBy(resourceId, transactionId) {
    const state = this.resource_locks.get(resourceId);
    if (!state) return false;
    return state.active_locks.some((l) => l.transactionId === transactionId);
  }
}

export default new LockManager();