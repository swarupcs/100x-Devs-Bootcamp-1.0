// Problem Description – Cancellable Dependency Graph (Abort Signal)
//
// You are given a DAG of async tasks where tasks may depend on other tasks.
// Your task is to implement runAbortableGraph(tasks, signal).
//
// Tasks should run with maximum possible concurrency while respecting dependencies.
//
// Requirements:
// 1. Start tasks as soon as their dependencies are resolved
// 2. Support cancellation using an AbortSignal
// 3. If aborted, stop scheduling new tasks immediately
// 4. Any downstream tasks not yet started must never run and should reject immediately
// 5. The function should reject with an AbortError when cancelled
//
// tasks shape: { name: { deps: [...], fn: async (signal) => result } }

async function runAbortableGraph(tasks, signal) {
  const names = Object.keys(tasks);
  const results = {};
  const running = new Map(); // name -> promise (memoised, so each runs once)

  const abortError = () => {
    // Named "AbortError" to match the DOM convention, so callers can branch on
    // err.name rather than string-matching a message.
    const err = new Error("AbortError");
    err.name = "AbortError";
    return err;
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn(arg);
    };

    function onAbort() {
      // Reject the OVERALL promise as soon as the abort fires, without waiting
      // for in-flight tasks to notice. Requirement 5: the caller learns
      // immediately, which is the whole point of cancellation — a caller who
      // still had to wait out the slowest running task would gain nothing.
      finish(reject, abortError());
    }

    // Already aborted before we started — nothing should run at all.
    if (signal.aborted) return finish(reject, abortError());
    signal.addEventListener("abort", onAbort, { once: true });

    function runTask(name) {
      if (running.has(name)) return running.get(name);

      const task = tasks[name];

      const promise = (async () => {
        // Wait for dependencies concurrently — this is what gives the graph its
        // natural parallelism.
        await Promise.all((task.deps || []).map(runTask));

        // THE CANCELLATION CHECKPOINT (requirement 4).
        //
        // Re-check the signal AFTER the dependencies resolve and immediately
        // BEFORE starting our own work. An abort that arrives while our parents
        // were running must stop us here — a downstream task that has not yet
        // begun should never begin. Checking only at the top of the function
        // would miss exactly this window, which is the whole subtlety of
        // cancelling a graph rather than a single call.
        if (signal.aborted) throw abortError();

        // Pass the signal down so a long-running task can cooperate and bail out
        // partway. Cancellation is always cooperative in JS: we can stop
        // SCHEDULING work, but only the task itself can stop DOING work.
        return task.fn(signal);
      })();

      running.set(name, promise);
      return promise;
    }

    Promise.all(names.map(runTask)).then((values) => {
      names.forEach((name, i) => {
        results[name] = values[i];
      });
      finish(resolve, results);
    }, (err) => finish(reject, err));
  });
}

module.exports = runAbortableGraph;
