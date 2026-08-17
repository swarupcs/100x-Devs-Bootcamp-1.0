// Problem Description – Distributed Mutex with Expiry (TTL Lock)
//
// You are required to implement a DistributedLock that provides exclusive access
// to a resource identified by a lockKey.
//
// Only one client can hold a lock at a time.
// If the lock is already held, new acquire requests must wait in a FIFO queue.
//
// Requirements:
// 1. Exclusive Access: only one active lock holder per lockKey
// 2. FIFO Queue: waiting acquire() calls must be served in order
// 3. TTL Expiry (Deadlock Guard):
//    - each lock is granted with a ttl (ms)
//    - after ttl expires, lock must auto-expire and be granted to next waiter
// 4. Safe Unlock:
//    - unlock() should release the lock immediately
//    - if unlock() is called after ttl already expired, ignore it
// 5. Lock Extension:
//    - extend(additionalMs) should increase ttl only if caller still owns the lock
//    - if caller lost ownership, ignore / reject

class DistributedLock {
  constructor() {
    this.locks = new Map(); // lockKey -> { currentOwner, expiresAt, timer, queue }
  }

  _getState(lockKey) {
    if (!this.locks.has(lockKey)) {
      this.locks.set(lockKey, {
        currentOwner: null,
        expiresAt: 0,
        timer: null,
        queue: [],
      });
    }
    return this.locks.get(lockKey);
  }

  acquire(lockKey, ttlMs) {
    const state = this._getState(lockKey);

    return new Promise((resolve) => {
      if (!state.currentOwner) {
        return resolve(this._grant(state, ttlMs));
      }
      // Held — queue up. FIFO, so no waiter can be starved by newcomers.
      state.queue.push({ resolve, ttlMs });
    });
  }

  _grant(state, ttlMs) {
    // The OWNERSHIP TOKEN is the heart of a safe TTL lock.
    //
    // A unique object identifies this particular grant. Every unlock() and
    // extend() is checked against it, which is what makes requirement 4 work:
    // once a lock has expired and been re-granted, the old holder's handle no
    // longer matches the current owner, so its unlock is silently ignored
    // instead of releasing someone ELSE's lock.
    //
    // This is a real and dangerous bug in naive distributed locks (Redis
    // implementations get it wrong constantly): client A stalls past its TTL,
    // the lock passes to B, A wakes up and calls DEL — and now B thinks it holds
    // a lock that is actually free, and C walks straight into the critical
    // section alongside it. Redlock's "random value" check exists for exactly
    // this reason.
    const token = {};

    state.currentOwner = token;
    state.expiresAt = Date.now() + ttlMs;
    this._armTimer(state, token);

    return {
      unlock: () => {
        // Ownership check — a stale handle is a no-op.
        if (state.currentOwner !== token) return false;
        this._release(state);
        return true;
      },

      extend: (additionalMs) => {
        // Requirement 5: only the current owner may extend. A holder who has
        // already lost the lock to expiry cannot claw it back.
        if (state.currentOwner !== token) return false;

        state.expiresAt += additionalMs;
        this._armTimer(state, token); // reschedule for the new deadline
        return true;
      },

      isHeld: () => state.currentOwner === token,
    };
  }

  // (Re)schedule the auto-expiry check for this grant.
  _armTimer(state, token) {
    if (state.timer) clearTimeout(state.timer);

    const remaining = Math.max(state.expiresAt - Date.now(), 0);

    state.timer = setTimeout(() => {
      // Guard against a stale timer firing after the lock has moved on.
      if (state.currentOwner !== token) return;

      // extend() may have pushed the deadline out; if so, re-arm rather than
      // expiring early.
      if (Date.now() < state.expiresAt) return this._armTimer(state, token);

      // TTL EXPIRY — the deadlock guard (requirement 3).
      //
      // Without it, a holder that crashes, hangs, or simply forgets to unlock
      // would block the resource permanently, and in a distributed system
      // there is no way to distinguish "still working" from "dead". A TTL
      // converts a permanent deadlock into a bounded delay: the worst case is
      // that the resource is unavailable for ttlMs.
      //
      // The trade-off is real, and it's why extend() exists: if the TTL is
      // shorter than the work, two clients can genuinely believe they hold the
      // lock at once. Long-running holders are expected to renew (a
      // "watchdog"/lease-renewal loop) rather than pick a huge TTL.
      this._release(state);
    }, remaining);
  }

  _release(state) {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }

    state.currentOwner = null;

    // Hand straight to the next waiter, without ever leaving the lock visibly
    // free. That direct hand-off is what preserves FIFO fairness — a newcomer
    // calling acquire() at this exact moment cannot barge ahead of the queue.
    if (state.queue.length > 0) {
      const next = state.queue.shift();
      next.resolve(this._grant(state, next.ttlMs));
    }
  }
}

module.exports = DistributedLock;
