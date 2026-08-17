// Problem Description – Task Execution with Dependencies
//
// You are given a set of asynchronous tasks where some tasks depend
// on the completion of others.
// Your goal is to execute each task only after all of its dependencies
// have been successfully completed.
// The solution should ensure correct execution order and handle
// dependency relationships properly.
//
// Each task is asynchronous and must invoke a callback when finished.
// Invoke finalCallback after all tasks have completed, or with an error
// if any task fails.
//
// Task shape: { id: string, deps: string[], run: (cb) => void }

function runWithDependencies(tasks, finalCallback) {
  if (!tasks || tasks.length === 0) return finalCallback(null, {});

  const results = {}; // id -> result value
  const done = new Set(); // ids that have completed successfully
  const started = new Set(); // ids already dispatched (prevents double-starting)
  let finished = false; // exactly-once latch for finalCallback

  // Index by id so dependency lookups are O(1) instead of scanning the array.
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const fail = (err) => {
    if (finished) return;
    finished = true;
    finalCallback(err, null);
  };

  // The scheduler. This is essentially a parallel topological sort: rather than
  // computing a linear order up front, we repeatedly ask "which tasks have all
  // their dependencies satisfied *right now*?" and launch all of them at once.
  // That naturally maximises parallelism — independent branches of the graph run
  // side by side instead of being serialised into one arbitrary order.
  function schedule() {
    if (finished) return;

    // All tasks accounted for — we're done.
    if (done.size === tasks.length) {
      finished = true;
      return finalCallback(null, results);
    }

    let launchedSomething = false;

    for (const task of tasks) {
      if (started.has(task.id)) continue; // already running or finished

      const deps = task.deps || [];
      // Ready means every dependency has already completed.
      const ready = deps.every((dep) => done.has(dep));
      if (!ready) continue;

      started.add(task.id);
      launchedSomething = true;

      task.run((err, result) => {
        if (finished) return;
        if (err) return fail(err); // one failure aborts the whole graph

        results[task.id] = result;
        done.add(task.id);

        // Completing this task may have unblocked others — re-run the scan.
        schedule();
      });
    }

    // Nothing running and nothing launchable means the graph is stuck: either a
    // dependency cycle (A needs B, B needs A) or a reference to an id that
    // doesn't exist. Detecting this is important — otherwise the function would
    // simply never call back, and the caller would hang with no diagnostic.
    if (!launchedSomething && started.size === done.size && done.size < tasks.length) {
      const stuck = tasks.filter((t) => !started.has(t.id)).map((t) => t.id);
      return fail(
        new Error(`Unresolvable dependencies (cycle or missing task): ${stuck.join(", ")}`)
      );
    }
  }

  // Guard against dependencies naming tasks that were never provided.
  for (const task of tasks) {
    for (const dep of task.deps || []) {
      if (!byId.has(dep)) {
        return fail(new Error(`Task "${task.id}" depends on unknown task "${dep}"`));
      }
    }
  }

  schedule();
}

module.exports = runWithDependencies;
