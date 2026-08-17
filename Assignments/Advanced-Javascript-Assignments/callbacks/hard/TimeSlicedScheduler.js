// Problem Description – Time-Sliced Task Scheduler
//
// You are required to build a scheduler that prevents long-running tasks
// from blocking the event loop.
//
// Tasks must periodically yield control back to the scheduler so that
// higher-priority or newly arrived tasks can execute.
//
// This simulates cooperative multitasking used in UI frameworks.

class TimeSlicedScheduler {
  constructor() {
    this.queue = [];
  }

  // `task` is an async function: () => Promise<void>
  schedule(task) {
    this.queue.push(task);
  }

  async run() {
    // Tasks run one at a time, in FIFO order, with a yield to the event loop
    // between each one. This is the pattern React's scheduler popularised: a
    // long list of work is chopped into slices so the browser can paint, handle
    // clicks, and run timers between slices instead of freezing for a second.
    while (this.queue.length > 0) {
      const task = this.queue.shift();

      // Await the task itself. Note that the first task begins executing
      // *synchronously* when run() is called — an async function body runs
      // eagerly up to its first await — so run() does real work before it
      // returns its promise.
      await task();

      // Yield a full macrotask, not just a microtask.
      //
      // This distinction matters enormously. `await Promise.resolve()` only
      // drains to the microtask queue, which runs to completion *before* the
      // event loop ever looks at timers or I/O — so it would not actually let
      // anything else in. setTimeout(0) parks us behind the timer queue, which
      // means already-pending timers and I/O callbacks get their turn first.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

module.exports = TimeSlicedScheduler;
