// Problem Description – Async Mutex with Timeout
//
// You need to acquire a lock before running an async task.
// If the lock cannot be acquired within a given time limit,
// the operation should fail.
//
// This problem tests concurrency control and timeout handling.
//
// acquire(timeoutMs) resolves with a `release` function, or rejects with
// "Lock Timeout" if the lock could not be obtained in time.

class TimedMutex {
  constructor() {
    this.locked = false;
    this.queue = []; // waiters: { resolve, reject, timer }
  }

  acquire(timeoutMs) {
    return new Promise((resolve, reject) => {
      // Fast path — the lock is free, take it immediately.
      if (!this.locked) {
        this.locked = true;
        return resolve(this._makeRelease());
      }

      // Slow path — queue up. We store the waiter's resolve/reject so a future
      // release() can hand it the lock, plus its own timeout timer.
      const waiter = { resolve, reject, timer: null };

      // The timeout is what distinguishes this from a plain mutex. Waiting
      // forever is a real hazard: if the holder deadlocks or crashes without
      // releasing, every waiter hangs silently with no error and no stack trace.
      // A bounded wait converts a silent hang into a visible, handleable failure.
      waiter.timer = setTimeout(() => {
        // Remove ourselves from the queue so a later release() doesn't hand the
        // lock to a waiter that has already given up — that would "leak" the
        // lock to nobody and stall every remaining waiter.
        const index = this.queue.indexOf(waiter);
        if (index !== -1) this.queue.splice(index, 1);

        reject("Lock Timeout");
      }, timeoutMs);

      this.queue.push(waiter);
    });
  }

  // Builds a single-use release function. Returning a closure rather than
  // exposing a public release() method is a deliberate safety property: only
  // the code that actually holds the lock can release it — no other caller can
  // reach in and unlock a mutex it doesn't own.
  _makeRelease() {
    let released = false;

    return () => {
      // Guard against double-release. Calling it twice would otherwise hand the
      // lock to two waiters at once, defeating the entire point of a mutex.
      if (released) return;
      released = true;

      if (this.queue.length > 0) {
        // Direct hand-off to the longest-waiting caller (FIFO = fair; nobody
        // starves). We never set `locked` to false in between, so a newcomer
        // calling acquire() at this instant cannot barge in ahead of the queue.
        const next = this.queue.shift();
        clearTimeout(next.timer); // it got the lock in time — disarm its deadline
        next.resolve(this._makeRelease());
      } else {
        this.locked = false; // nobody waiting; the mutex goes idle
      }
    };
  }
}

module.exports = TimedMutex;
