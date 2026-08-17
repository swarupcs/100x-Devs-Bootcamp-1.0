// Problem Description – Async Semaphore (Concurrency Guard)
//
// You are required to implement an async Semaphore that controls
// access to a limited resource.
//
// The semaphore has a fixed number of permits.
// Tasks must acquire a permit before executing and release it after finishing.
//
// Requirements:
// 1. Only N tasks may run concurrently
// 2. Excess tasks must wait (not reject)
// 3. Permits must be released even if a task throws
// 4. Execution order must be fair (FIFO)
//
// This pattern is widely used in databases, connection pools,
// and file system access control.

class Semaphore {
  constructor(max) {
    this.max = max;
    this.available = max; // permits currently free
    this.waiters = []; // resolve functions of blocked acquire() calls, FIFO
  }

  // Returns a promise that resolves once a permit has been granted.
  acquire() {
    // Fast path: a permit is free, so take it and let the caller proceed in the
    // very next microtask.
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }

    // Slow path: no permits. We must make the caller WAIT rather than reject.
    //
    // The trick is to construct a promise and stash its `resolve` function
    // instead of calling it. The promise stays pending — so the caller's `await`
    // is genuinely suspended — until some future release() reaches into this
    // array and invokes the stored resolve. This "deferred" pattern is how you
    // build any blocking primitive on top of promises.
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release() {
    // If someone is waiting, hand the permit DIRECTLY to them rather than
    // incrementing `available` and letting anyone grab it. That direct handoff
    // is what guarantees fairness: a task that arrives at this instant cannot
    // barge ahead of one that has been queued since earlier.
    if (this.waiters.length > 0) {
      const next = this.waiters.shift(); // shift = FIFO (pop would be LIFO/unfair)
      next(); // unblocks exactly one waiting acquire()
      return;
    }

    // Nobody waiting — return the permit to the pool, never exceeding `max`.
    this.available = Math.min(this.available + 1, this.max);
  }

  async run(task) {
    await this.acquire();

    try {
      return await task();
    } finally {
      // `finally` is non-negotiable here. If a task throws and we released only
      // on the success path, that permit would be gone forever; after `max`
      // failures the semaphore would be permanently exhausted and every future
      // task would block on a queue that can never drain — a silent deadlock
      // with no error message. This is the single most common bug in hand-rolled
      // concurrency primitives.
      this.release();
    }
  }
}

module.exports = Semaphore;
