// Problem Description – Worker Pool with Backpressure
//
// You are required to implement a WorkerPool that limits concurrent execution
// of async tasks.
//
// The pool should accept tasks via an enqueue() method.
// Only N tasks may run at the same time.
// The internal queue has a maximum capacity.
//
// If enqueue() is called when the queue is full, it must immediately
// return a rejected Promise to signal backpressure.
//
// This pattern is commonly used to prevent overload in high-throughput systems.

class WorkerPool {
  constructor(limit, maxQueue) {
    this.limit = limit; // max concurrently running tasks
    this.maxQueue = maxQueue; // max tasks that may sit waiting
    this.running = 0;
    this.queue = []; // { task, resolve, reject }
  }

  enqueue(task) {
    // --- Backpressure --------------------------------------------------------
    // This rejection is the entire point of the exercise. An unbounded queue
    // does not actually protect a system: under sustained overload it grows
    // until memory runs out, and by then every queued item has been waiting so
    // long that its result is worthless anyway.
    //
    // Rejecting instead pushes the problem back to the CALLER, who is the only
    // one who can meaningfully respond — by retrying later, shedding the
    // request, or returning a 503. That's why load shedding beats infinite
    // buffering: fail fast and visibly rather than slowly and invisibly.
    if (this.queue.length >= this.maxQueue) {
      return Promise.reject(new Error("Queue is full"));
    }

    // Admit the task. We hand back a promise now and stash its resolve/reject so
    // they can be fired whenever the task eventually gets a turn — the caller's
    // await is suspended in the meantime.
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.run();
    });
  }

  run() {
    // Fill every free slot. `while` rather than `if` because a burst of
    // enqueues, or several tasks finishing at once, can free multiple slots.
    while (this.running < this.limit && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift(); // FIFO
      this.running++;

      // Promise.resolve() wraps the call so a task that throws SYNCHRONOUSLY is
      // handled on the same path as one that rejects — without it a sync throw
      // would escape past the accounting below and leak a slot.
      Promise.resolve()
        .then(() => task())
        .then(resolve, reject)
        .finally(() => {
          // Free the slot on both paths, then pull in the next task. Failing to
          // decrement on the error path would shrink the pool by one worker per
          // failure until it stopped entirely.
          this.running--;
          this.run();
        });
    }
  }
}

module.exports = WorkerPool;
