// Problem Description – Rate Limiter (Token Bucket / Sliding Window)
//
// You are required to implement a `RateLimiter` class that restricts the
// number of executions of a given task within a specific time window.
//
// The limiter should ensure that no more than `limit` tasks are executed
// in any given `windowMs` period.
//
// Requirements:
// 1. The constructor should accept `limit` (max tasks) and `windowMs` (time window).
// 2. The `throttle(task)` method should return a Promise that resolves when the task
//    can be executed.
// 3. If the limit is reached, subsequent tasks must wait until the window allows
//    another execution.
// 4. Tasks should be executed in the order they were submitted (FIFO).
//
// This is a common pattern for API rate limiting and resource management.

class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.timestamps = []; // start times of recent executions, oldest first
    this.queue = []; // { task, resolve, reject } awaiting a slot
    this.timer = null; // pending wake-up, so we never arm two at once
  }

  throttle(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._process();
    });
  }

  _process() {
    const now = Date.now();

    // --- Slide the window ----------------------------------------------------
    // Drop every record older than windowMs. This is a SLIDING window, not a
    // fixed one, and the difference matters: with fixed buckets ("100 per
    // minute, reset on the minute") a client can send 100 at 11:59:59 and
    // another 100 at 12:00:00 — 200 requests in one second while technically
    // never breaking the rule. A sliding window looks back windowMs from *now*,
    // so that burst is impossible.
    while (this.timestamps.length > 0 && now - this.timestamps[0] >= this.windowMs) {
      this.timestamps.shift();
    }

    // --- Dispatch whatever the window currently allows -----------------------
    while (this.queue.length > 0 && this.timestamps.length < this.limit) {
      const { task, resolve, reject } = this.queue.shift(); // FIFO ordering

      // Record the execution BEFORE running the task. The limiter governs how
      // often tasks are STARTED, independent of how long they take — and it must
      // count a task that fails just the same as one that succeeds, otherwise a
      // caller could bypass the limit entirely by sending requests that error.
      this.timestamps.push(Date.now());

      Promise.resolve()
        .then(() => task())
        .then(resolve, reject);
    }

    // --- Schedule the next wake-up -------------------------------------------
    // Still work queued but no capacity: sleep until the OLDEST timestamp falls
    // out of the window, which is the earliest instant a slot can open.
    //
    // Polling on a short interval would work too but wastes wake-ups; computing
    // the exact deadline means precisely one timer per stall.
    if (this.queue.length > 0 && !this.timer) {
      const waitMs = this.timestamps[0] + this.windowMs - Date.now();

      this.timer = setTimeout(() => {
        this.timer = null;
        this._process();
      }, Math.max(waitMs, 0));
    }
  }
}

module.exports = RateLimiter;
