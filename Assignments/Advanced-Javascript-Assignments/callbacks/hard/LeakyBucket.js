// Problem Description – Leaky Bucket Rate Limiter
//
// You are required to implement a RateLimiter based on the Leaky Bucket algorithm.
//
// The rate limiter has a fixed capacity and processes tasks at a constant rate.
// Tasks are executed in the exact order they are received.
//
// Requirements:
// 1. The bucket has a maximum capacity
// 2. Tasks are processed at a fixed interval (leak rate)
// 3. If the bucket is full, new tasks must be rejected immediately
// 4. Fairness must be preserved (FIFO execution)

class LeakyBucket {
  constructor(capacity, leakRateMs) {
    this.capacity = capacity; // max items the bucket can hold
    this.leakRateMs = leakRateMs; // fixed gap between task executions
    this.queue = []; // the bucket contents (FIFO)
    this.processing = false; // is the drain loop currently running?
  }

  add(task, onComplete) {
    // The mental model: requests pour into a bucket, and the bucket leaks at a
    // constant rate through a hole in the bottom. Bursty input is smoothed into
    // a perfectly steady output. When the bucket overflows, the excess is
    // discarded — hence an *immediate* rejection rather than unbounded queuing.
    //
    // Note the in-flight task is still counted as occupying the bucket (we only
    // remove it once it completes), which is what makes capacity a true bound
    // on outstanding work rather than just on the waiting list.
    if (this.queue.length >= this.capacity) {
      return onComplete(new Error("Rate Limit Exceeded"));
    }

    this.queue.push({ task, onComplete });
    this._process();
  }

  _process() {
    // The `processing` flag makes the drain loop a singleton. Without it, every
    // add() would start its own loop and tasks would fire back-to-back, breaking
    // the constant leak rate.
    if (this.processing) return;
    this.processing = true;
    this._runNext();
  }

  _runNext() {
    if (this.queue.length === 0) {
      this.processing = false; // bucket empty; the loop parks itself
      return;
    }

    // Peek, don't shift — the head stays in the bucket for the whole time it is
    // executing, so capacity accounting stays honest (see add()).
    const { task, onComplete } = this.queue[0];

    task((err, result) => {
      // Deliver the outcome, success or failure...
      if (onComplete) onComplete(err, result);

      // ...then remove the item and wait out the leak interval before the next
      // one. A failed task is drained exactly like a successful one: the limiter
      // shapes traffic, it has no opinion about results.
      this.queue.shift();
      setTimeout(() => this._runNext(), this.leakRateMs);
    });
  }
}

module.exports = LeakyBucket;
