// Problem Description – Parallel Execution with Concurrency Limit
//
// You need to execute many asynchronous tasks (e.g., image downloads),
// but only a fixed number are allowed to run at the same time to avoid
// resource exhaustion.
//
// This problem tests concurrency control and result ordering.
//
// Requirements:
// - Accept an array of tasks and a concurrency limit.
// - Run at most `limit` tasks in parallel until all are completed.
// - Return results in the original task order via onAllFinished.

function mapLimit(tasks, limit, onAllFinished) {
  if (!tasks || tasks.length === 0) return onAllFinished(null, []);

  // Fixed-length results array: each task writes to the index it was launched
  // from, so the output order is the *input* order regardless of which task
  // happens to finish first.
  const results = new Array(tasks.length);

  let nextIndex = 0;
  let completed = 0;
  let settled = false; // exactly-once latch for onAllFinished

  function launch() {
    if (settled || nextIndex >= tasks.length) return;

    const index = nextIndex++;
    const task = tasks[index];

    task((err, data) => {
      if (settled) return;

      if (err) {
        settled = true;
        return onAllFinished(err, null);
      }

      results[index] = data;
      completed++;

      if (completed === tasks.length) {
        settled = true;
        return onAllFinished(null, results);
      }

      // This worker slot is free again — immediately pull in the next task.
      // Because each finishing task launches exactly one replacement, the number
      // of in-flight tasks stays pinned at `limit` until the queue runs dry.
      launch();
    });
  }

  // Open `limit` parallel "lanes". After this, the pipeline is self-sustaining.
  for (let i = 0; i < Math.min(limit, tasks.length); i++) {
    launch();
  }
}

module.exports = mapLimit;
