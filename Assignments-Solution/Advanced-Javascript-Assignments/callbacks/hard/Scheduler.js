// Problem Description – Preemptive Priority Task Scheduler
//
// You are required to build a scheduler that executes async tasks
// based on priority.
//
// Higher-priority tasks should be executed before lower-priority ones.
// Long-running tasks must periodically yield control back to the scheduler
// so that newly arrived high-priority tasks can be processed.
//
// True preemption is not possible in JavaScript, so tasks must cooperate
// by yielding execution voluntarily.

class Scheduler {
  constructor() {
    this.queue = [];
    this.seq = 0; // insertion counter, used to break priority ties fairly
  }

  schedule(task, priority = 0) {
    this.queue.push({ task, priority, seq: this.seq++ });
  }

  run(onAllFinished) {
    // The key design decision: we do NOT sort the queue once and then walk it.
    // We re-select the highest-priority task before *every* dispatch.
    //
    // That is what makes this scheduler behave "preemptively" from the outside:
    // a task scheduled at high priority while other work is queued jumps ahead
    // of everything still waiting. Real preemption (interrupting a running task
    // mid-execution) is impossible in JS — a function owns the thread until it
    // returns or awaits — so the best we can do is re-decide at every yield point.
    const step = () => {
      if (this.queue.length === 0) {
        return onAllFinished(null);
      }

      // Highest priority first; ties go to whoever was scheduled first.
      let bestIndex = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const c = this.queue[i];
        const b = this.queue[bestIndex];
        if (c.priority > b.priority || (c.priority === b.priority && c.seq < b.seq)) {
          bestIndex = i;
        }
      }

      const { task } = this.queue.splice(bestIndex, 1)[0];

      task((err) => {
        // Any failure aborts the whole run and is reported once.
        if (err) return onAllFinished(err);

        // Yield to the event loop before picking the next task. This is the
        // "cooperative" half of cooperative multitasking: it gives timers, I/O
        // callbacks, and freshly scheduled high-priority tasks a chance to be
        // seen, instead of the scheduler monopolising the thread in a tight loop.
        setImmediate(step);
      });
    };

    step();
  }
}

module.exports = Scheduler;
