// Problem Description – Fair FIFO Mutex
//
// Implement a Mutex to control access to an async resource.
//
// Only one task may run at a time. Extra tasks must wait in a queue
// and be executed in FIFO order.
//
// When a task finishes, the lock should be released automatically
// and the next queued task should start.
//
// Requirements:
// - Run immediately if free.
// - Queue when locked (FIFO).
// - Auto-release on task completion.

class Mutex {
  constructor() {
    this.locked = false; // is a task currently holding the lock?
    this.queue = []; // waiters, in arrival order
  }

  lock(task, onComplete) {
    // "Fair" here means FIFO: waiters are served strictly in arrival order, so
    // no task can be starved by a steady stream of newcomers. (An unfair mutex
    // — e.g. one that just lets whoever asks next barge in — is faster but can
    // leave an unlucky task waiting forever under load.)
    this.queue.push({ task, onComplete });

    // Only one dispatch path exists, which keeps the "at most one runner"
    // invariant in a single place.
    if (!this.locked) this._release();
  }

  _release() {
    if (this.queue.length === 0) {
      this.locked = false; // nothing waiting — leave the mutex free
      return;
    }

    this.locked = true;
    const { task, onComplete } = this.queue.shift();

    // Guard against a misbehaving task calling its callback more than once.
    // Without this, a double-call would release the lock twice and let two
    // tasks run concurrently — exactly the thing a mutex exists to prevent.
    let released = false;

    task((err, result) => {
      if (released) return;
      released = true;

      // Deliver the result to this task's own caller. Note that an *error* is
      // just a result here: the lock still gets released and the queue keeps
      // draining, so one failing task can never wedge the mutex permanently.
      if (onComplete) onComplete(err, result);

      this._release();
    });
  }
}

module.exports = Mutex;
