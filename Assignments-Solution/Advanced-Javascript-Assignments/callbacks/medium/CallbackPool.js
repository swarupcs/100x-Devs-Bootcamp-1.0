// Problem Description – Asynchronous Worker Pool
//
// You are required to create a worker pool that manages the execution
// of asynchronous tasks.
// The pool should ensure that no more than N tasks are running concurrently,
// while any additional tasks are queued.
// As tasks complete, queued tasks should start automatically.
// Each task must invoke its callback with its result when finished.

class CallbackPool {
  constructor(limit) {
    this.limit = limit; // max tasks allowed to run at the same time
    this.running = 0; // how many are in flight right now
    this.queue = []; // FIFO backlog of { task, onComplete } waiting for a slot
  }

  // Submit a task. `task` is a function of shape (cb) => void, error-first.
  run(task, onComplete) {
    // Always enqueue first, then let a single scheduler decide what starts.
    // Keeping "admit" and "schedule" separate (rather than branching here on
    // `running < limit`) means there is exactly one place where the concurrency
    // invariant is enforced — much harder to get wrong as the class grows.
    this.queue.push({ task, onComplete });
    this._next();
  }

  // The scheduler: fill every free slot with queued work.
  _next() {
    // `while`, not `if` — after a burst of run() calls, or when the limit is
    // raised, several slots may be free at once and all should be filled.
    while (this.running < this.limit && this.queue.length > 0) {
      const { task, onComplete } = this.queue.shift(); // FIFO ordering
      this.running++;

      // The pool's contract with the task is the error-first callback. Whatever
      // the task reports we forward untouched — the pool schedules work, it does
      // not interpret results.
      task((err, result) => {
        // Free the slot BEFORE recursing, otherwise the invariant check in the
        // next _next() would still see this task as running and stall the pool.
        this.running--;

        if (onComplete) onComplete(err, result);

        // A slot just opened; pull the next queued task into it.
        this._next();
      });
    }
  }
}

module.exports = CallbackPool;
