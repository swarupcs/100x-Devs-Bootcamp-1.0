// Problem Description – Dependency-Aware Stream Merger
//
// You are required to implement streamMergeGraph(taskGraph, limit).
//
// You are given a set of file merge tasks where each task may depend on other tasks.
// Some files must be processed before others (dependency graph / DAG).
//
// Requirements:
// 1. Tasks must execute only after all dependencies are completed
// 2. Tasks should start as soon as dependencies are satisfied
// 3. Enforce a concurrency limit (max limit tasks running at once)
// 4. Use streaming-style processing to avoid high memory usage
//
// taskGraph shape: { name: { deps: [...], action: async () => result } }

async function streamMergeGraph(taskGraph, limit) {
  const names = Object.keys(taskGraph);
  const results = {};

  const completed = new Set();
  const started = new Set();
  let running = 0;

  return new Promise((resolve, reject) => {
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    // The scheduler enforces TWO independent constraints at once, which is what
    // makes this harder than either problem alone:
    //
    //   1. Dependency readiness — a task may only start once every task in its
    //      `deps` has completed.
    //   2. Concurrency — at most `limit` tasks may be in flight, regardless of
    //      how many are ready.
    //
    // A ready task therefore may still have to wait for a free slot, and a free
    // slot may go unused because nothing is ready. Re-running this scan whenever
    // either condition changes (a task finishes) keeps both satisfied.
    function schedule() {
      if (settled) return;

      if (completed.size === names.length) {
        settled = true;
        return resolve(results);
      }

      for (const name of names) {
        if (running >= limit) break; // no capacity — stop scanning
        if (started.has(name)) continue;

        const task = taskGraph[name];
        const deps = task.deps || [];

        // Not all prerequisites are done — skip for now; a later completion will
        // bring us back here.
        if (!deps.every((dep) => completed.has(dep))) continue;

        started.add(name);
        running++;

        Promise.resolve()
          .then(() => task.action())
          .then(
            (value) => {
              if (settled) return;

              // "Streaming-style": we keep only the finished RESULT per task and
              // let each action manage its own data flow, rather than
              // accumulating every intermediate buffer in memory. With a
              // concurrency limit in place, peak memory is bounded by `limit`
              // concurrent actions rather than by the size of the whole graph —
              // which is the entire point when merging large files.
              results[name] = value;
              completed.add(name);
              running--;

              // A slot freed AND a dependency was satisfied — both reasons to
              // re-scan.
              schedule();
            },
            fail
          );
      }

      // Deadlock guard: nothing running, nothing startable, but work remains.
      // That means a dependency cycle or a reference to a task that isn't in the
      // graph. Without this the promise would simply never settle.
      if (running === 0 && completed.size < names.length && !settled) {
        const stuck = names.filter((n) => !started.has(n));
        return fail(
          new Error(`Unresolvable dependencies (cycle or missing task): ${stuck.join(", ")}`)
        );
      }
    }

    if (names.length === 0) return resolve(results);
    schedule();
  });
}

module.exports = streamMergeGraph;
