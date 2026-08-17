// Problem Description – Sliding Window Weighted Rate Limiter
//
// You are required to implement a WeightedRateLimiter for API traffic control.
//
// Each request has a weight, and the system allows only a maximum total weight
// within a sliding time window (example: 100 points per 60 seconds).
//
// Implement request(fn, weight):
// 1. If current window usage + weight <= limit, execute fn immediately
// 2. Otherwise, queue the request (FIFO fairness)
// 3. As time passes and old weights expire from the window, queued requests
//    should automatically execute when allowed

class WeightedRateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit; // max total WEIGHT allowed in the window
    this.windowMs = windowMs;
    this.records = []; // { at, weight } for recent executions, oldest first
    this.queue = []; // FIFO backlog
    this.timer = null;
  }

  // Drop records that have aged out of the sliding window.
  //
  // Weighted limiting reflects how real APIs price their quotas: a cheap lookup
  // and an expensive bulk export should not both count as "one request". Costing
  // by weight lets a client spend its budget on whatever mix it actually needs.
  _prune() {
    const cutoff = Date.now() - this.windowMs;
    while (this.records.length > 0 && this.records[0].at <= cutoff) {
      this.records.shift();
    }
  }

  _currentUsage() {
    return this.records.reduce((sum, r) => sum + r.weight, 0);
  }

  _processQueue() {
    this._prune();

    // Only ever consider the HEAD of the queue.
    //
    // This is what enforces FIFO fairness, and it is a deliberate trade. A
    // smarter scheduler could scan past a blocked heavyweight request and let a
    // cheap one through — better utilisation, but it lets small requests
    // permanently starve a large one that never quite fits. Refusing to reorder
    // means a big request is guaranteed to run once its turn comes.
    while (this.queue.length > 0) {
      const head = this.queue[0];

      if (this._currentUsage() + head.weight > this.limit) break; // no budget yet

      this.queue.shift();
      this.records.push({ at: Date.now(), weight: head.weight });
      this._execute(head);
    }

    // Something is still blocked: schedule a wake-up for the moment the OLDEST
    // record falls out of the window, since that is the earliest instant budget
    // can free up. Computing the exact deadline means one timer per stall rather
    // than a busy polling loop.
    if (this.queue.length > 0 && !this.timer && this.records.length > 0) {
      const waitMs = this.records[0].at + this.windowMs - Date.now();
      this.timer = setTimeout(() => {
        this.timer = null;
        this._processQueue();
      }, Math.max(waitMs, 1));
    }
  }

  async _execute({ fn, resolve, reject }) {
    try {
      resolve(await fn());
    } catch (err) {
      reject(err);
    } finally {
      // A completed request may not free budget (the record only expires with
      // time), but re-checking is cheap and keeps the queue moving.
      this._processQueue();
    }
  }

  request(fn, weight) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, weight, resolve, reject });

      // Run the scheduler SYNCHRONOUSLY. When there is budget available and
      // nothing queued ahead, the caller's fn starts in this very tick rather
      // than being needlessly deferred — a rate limiter should be invisible
      // while you're under the limit.
      this._processQueue();
    });
  }
}

module.exports = WeightedRateLimiter;
