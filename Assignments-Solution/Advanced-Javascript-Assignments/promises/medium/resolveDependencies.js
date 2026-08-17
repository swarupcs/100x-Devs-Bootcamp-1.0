// Problem Description – Dependency Resolver (Simple DAG)
//
// You are given an object of tasks where each task may depend on other tasks.
// Your task is to implement resolveDependencies(tasks).
//
// Tasks without dependencies should start immediately in parallel.
// Tasks with dependencies must wait until all required parent tasks finish.
//
// Input example:
// { A: { fn }, B: { fn }, C: { fn, deps: ['A','B'] } }

async function resolveDependencies(tasks) {
  // name -> promise for that task's eventual result.
  //
  // Memoising the PROMISE (not the value) is the elegant core of this solution.
  // It means a task shared by several dependents runs exactly once — the second
  // dependent that asks for "A" gets the same in-flight promise the first one
  // did, rather than starting a duplicate run.
  const started = new Map();

  function runTask(name) {
    // Already started (or finished) — return the existing promise.
    if (started.has(name)) return started.get(name);

    const task = tasks[name];
    if (!task) {
      return Promise.reject(new Error(`Unknown task: ${name}`));
    }

    const deps = task.deps || [];

    // Build the promise for this task and register it IMMEDIATELY, before any
    // awaiting happens. Registering first is what prevents a diamond dependency
    // (D needs B and C, both of which need A) from launching A twice.
    const promise = (async () => {
      // Wait for all parents CONCURRENTLY. A task's dependencies are independent
      // of each other, so there's no reason to serialise them — and this
      // recursion transparently resolves grandparents too.
      await Promise.all(deps.map((dep) => runTask(dep)));

      // Every prerequisite has completed; now the task itself may run.
      return task.fn();
    })();

    started.set(name, promise);
    return promise;
  }

  const names = Object.keys(tasks);

  // Kick off EVERY task at once. Each one immediately blocks on its own
  // dependencies, so the graph self-schedules: roots start straight away, and
  // each node fires the instant its last parent finishes.
  //
  // This is a much better shape than computing a linear topological order and
  // walking it — a linear order needlessly serialises independent branches,
  // whereas this achieves the maximum parallelism the graph allows. The critical
  // path is the only lower bound.
  const results = await Promise.all(names.map((name) => runTask(name)));

  // Reassemble into a { taskName: result } object, matching the input's shape.
  const output = {};
  names.forEach((name, i) => {
    output[name] = results[i];
  });

  return output;

  // Caveat: a genuine dependency CYCLE (A needs B, B needs A) would deadlock
  // here — each promise waits on the other and neither ever settles. A
  // production resolver would detect cycles up front with a colour-marking DFS.
}

module.exports = resolveDependencies;
