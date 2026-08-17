// Problem Description – Priority Task Queue
//
// You are required to implement a PriorityQueueExecutor that runs async tasks sequentially.
//
// The executor must support push(task, priority), where higher priority runs first.
// If tasks are waiting, newly added high-priority tasks should jump ahead of
// lower-priority ones.

class PriorityQueueExecutor {
  constructor() {
    this.queue = [];
    this.running = false; // is the drain loop active?
    this.seq = 0; // insertion order, used to break priority ties
  }

  push(task, priority = 0) {
    this.queue.push({ task, priority, seq: this.seq++ });

    // Start the drain loop if it isn't already running. The `running` flag makes
    // it a singleton — without it, every push would start a competing loop and
    // tasks would run concurrently instead of sequentially.
    if (!this.running) this._run();
  }

  async _run() {
    this.running = true;

    while (this.queue.length > 0) {
      // Select the best task at DISPATCH time, not at insert time.
      //
      // This is the whole reason a high-priority task can "jump ahead": while
      // the current task is awaiting, push() can add anything to the queue, so
      // any ordering decided earlier would already be out of date. Re-scanning
      // before each dispatch means the queue always reflects the newest
      // information.
      //
      // Note what this does NOT do: it never interrupts the RUNNING task. JS has
      // no preemption — a function owns the thread until it awaits or returns —
      // so the highest-priority task waits for the current one to finish. (Hence
      // "LOW" completing first in the tests: it was already running when HIGH
      // arrived.)
      let bestIndex = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const c = this.queue[i];
        const b = this.queue[bestIndex];
        if (c.priority > b.priority || (c.priority === b.priority && c.seq < b.seq)) {
          bestIndex = i;
        }
      }

      const { task } = this.queue.splice(bestIndex, 1)[0];

      try {
        await task();
      } catch {
        // Swallow per-task failures deliberately. One bad task must not kill the
        // executor and strand every task queued behind it — the loop's job is to
        // keep draining. (A production version would surface this via an
        // onError hook or by resolving a per-task promise.)
      }
    }

    // Queue drained. Park the loop so the next push() can restart it.
    this.running = false;
  }
}

module.exports = PriorityQueueExecutor;
