// Problem Description – Promise-Based Worker Pool
//
// You are required to implement a PromisePool that limits how many async tasks
// run at the same time.
//
// The pool exposes run(task), where `task` is a function returning a Promise.
// run() returns a Promise that settles with that individual task's result.
//
// Requirements:
// 1. At most N tasks may run concurrently
// 2. Extra tasks wait in a FIFO queue and start as slots free up
// 3. Each caller receives its own task's result (or error)
// 4. A failing task must not stall the pool

class PromisePool {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = []; // { task, resolve, reject } waiting for a slot
  }

  run(task) {
    return new Promise((resolve, reject) => {
      // Always enqueue, then let a single scheduler decide what starts.
      // Keeping "admit" and "dispatch" separate means the concurrency invariant
      // is enforced in exactly one place — much harder to break later than a
      // branch here on `running < limit`.
      this.queue.push({ task, resolve, reject });
      this._next();
    });
  }

  _next() {
    // `while`, not `if`: a burst of run() calls, or several tasks completing at
    // once, can free multiple slots that should all be filled immediately.
    while (this.running < this.limit && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift(); // FIFO = fair
      this.running++;

      // Promise.resolve().then(() => task()) rather than task() directly: this
      // normalises a task that throws SYNCHRONOUSLY into a rejected promise, so
      // it takes the same path as an async failure. Without it, a sync throw
      // would escape past the accounting below and permanently leak a slot.
      Promise.resolve()
        .then(() => task())
        // Requirement 3: settle THIS caller's promise with THIS task's outcome.
        // Each caller awaits independently and never sees the pool's internals.
        .then(resolve, reject)
        .finally(() => {
          // Requirement 4. Freeing the slot in `finally` means it happens on
          // both the success and failure paths. Decrementing only on success
          // would shrink the pool by one worker per failure until it stopped
          // dispatching entirely — a slow, silent deadlock.
          this.running--;
          this._next();
        });
    }
  }
}

module.exports = PromisePool;
