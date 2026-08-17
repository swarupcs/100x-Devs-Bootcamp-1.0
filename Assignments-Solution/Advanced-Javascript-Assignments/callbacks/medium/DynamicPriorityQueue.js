// Problem Description – Priority Task Queue with Dynamic Concurrency
//
// You are required to implement a task queue that executes asynchronous
// tasks based on priority.
// Higher-priority tasks should be executed before lower-priority ones.
// The queue must enforce a concurrency limit, ensuring only a fixed number
// of tasks run at the same time.
// The concurrency limit can be updated dynamically while the system is running.
//
// Each task must invoke its callback when finished.

class DynamicPriorityQueue {
  constructor(concurrency) {
    this.limit = concurrency;
    this.running = 0;
    this.queue = []; // pending { task, priority, onComplete, seq }
    this.seq = 0; // monotonic counter used as a tie-breaker (see below)
  }

  // Change the concurrency limit while tasks are already running.
  setLimit(newLimit) {
    this.limit = newLimit;

    // Raising the limit must take effect *immediately*, not only when the next
    // task happens to finish — so we kick the scheduler to fill the new slots.
    // Lowering the limit cannot preempt work that is already in flight; it just
    // means no new task starts until `running` drops back below the new limit.
    this.runNext();
  }

  add(task, priority, onComplete) {
    this.queue.push({ task, priority, onComplete, seq: this.seq++ });
    this.runNext();
  }

  runNext() {
    while (this.running < this.limit && this.queue.length > 0) {
      // Pick the best candidate: highest priority wins; among equal priorities
      // the one added first wins (that's what `seq` is for). Without the
      // tie-breaker, sorting would be unstable in spirit and same-priority tasks
      // could run out of submission order — a subtle source of "why did B run
      // before A?" bugs. This makes the queue a *stable* priority queue.
      let bestIndex = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const candidate = this.queue[i];
        const best = this.queue[bestIndex];
        if (
          candidate.priority > best.priority ||
          (candidate.priority === best.priority && candidate.seq < best.seq)
        ) {
          bestIndex = i;
        }
      }

      // splice removes and returns the chosen entry in one step.
      // Note we re-scan on every dispatch rather than sorting once up front —
      // that's deliberate, because `add` can insert a higher-priority task at any
      // moment, so the ordering must be decided at dispatch time, not at insert
      // time. (A real heap would make this O(log n) instead of O(n); for the
      // queue sizes here the linear scan is simpler and plenty fast.)
      const { task, onComplete } = this.queue.splice(bestIndex, 1)[0];
      this.running++;

      task((err, result) => {
        this.running--;
        if (onComplete) onComplete(err, result);
        this.runNext(); // a slot opened up
      });
    }
  }
}

module.exports = DynamicPriorityQueue;
