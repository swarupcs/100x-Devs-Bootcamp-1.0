// Problem Description – Concurrency-Limited Task Executor
//
// You are given an array of asynchronous tasks and a number maxConcurrent.
// Your task is to execute the tasks while ensuring that no more than maxConcurrent tasks
// run at the same time.
// As soon as one task completes, the next pending task should start.
// The final output must preserve the original task order.

async function taskScheduler(tasks, maxConcurrent) {
  const results = new Array(tasks.length);
  let nextIndex = 0; // shared cursor into the task list

  // Each worker repeatedly claims the next unstarted task. Because there are
  // exactly `maxConcurrent` workers and each runs one task at a time, the
  // concurrency bound is structural rather than something we have to track.
  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;

      // The tasks are thunks — functions that START the work when called. That
      // laziness is essential: an array of already-created promises would
      // ALREADY be running, and no scheduler could then limit anything. This is
      // why concurrency utilities always take `() => doWork()` rather than
      // `doWork()`.
      results[index] = await tasks[index]();
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrent, tasks.length); i++) {
    workers.push(worker());
  }

  // Fail-fast: if any task rejects, its worker's loop unwinds and Promise.all
  // rejects with that error right away. The sibling workers keep running to
  // completion in the background (promises can't be cancelled) but their results
  // are discarded.
  await Promise.all(workers);

  return results; // index-keyed, so output order == input order
}

module.exports = taskScheduler;
