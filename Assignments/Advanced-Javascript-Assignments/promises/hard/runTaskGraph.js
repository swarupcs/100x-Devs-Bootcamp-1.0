// Problem Description – Dependency-Aware Task Scheduler
//
// You are required to write an async function that executes a set of tasks.
// Each task has a unique id, an async action, and a list of dependency task IDs.
//
// A task can only execute after all of its dependencies have completed.
// Tasks with no dependencies should start immediately and may run in parallel.
//
// The function must:
// 1. Execute tasks as soon as their dependencies are resolved
// 2. Detect circular dependencies and throw an error
// 3. Throw an error if a task depends on a missing task
//
// The function should return a map of taskId → result.

async function runTaskGraph(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));

  // Validate up front: a dependency on a task that doesn't exist would otherwise
  // manifest as a promise that simply never settles — a hang with no diagnostic.
  for (const task of tasks) {
    for (const dep of task.dependencies || []) {
      if (!byId.has(dep)) {
        throw new Error(`Task "${task.id}" depends on missing task "${dep}"`);
      }
    }
  }

  // --- Cycle detection (three-colour DFS) ----------------------------------
  // This MUST happen before execution. A cycle in a promise-based scheduler
  // deadlocks silently: A awaits B, B awaits A, neither ever settles, and the
  // caller waits forever with no error to debug.
  //
  // The three states are the standard trick:
  //   unvisited  – not yet explored
  //   visiting   – on the current DFS path (grey)
  //   visited    – fully explored, known safe (black)
  //
  // Meeting a "visiting" node means we've looped back onto our own path — a
  // genuine cycle. Meeting a "visited" node is fine: it's a diamond (two paths
  // converging), not a loop. Conflating the two is the classic bug here, and it
  // would falsely report cycles in perfectly valid DAGs.
  const state = new Map();

  function detectCycle(id, path) {
    const current = state.get(id);
    if (current === "visited") return;
    if (current === "visiting") {
      throw new Error(`Circular dependency detected: ${[...path, id].join(" -> ")}`);
    }

    state.set(id, "visiting");
    for (const dep of byId.get(id).dependencies || []) {
      detectCycle(dep, [...path, id]);
    }
    state.set(id, "visited");
  }

  for (const task of tasks) detectCycle(task.id, []);

  // --- Execution ------------------------------------------------------------
  // Memoise the PROMISE per task id. This gives "run each task exactly once"
  // for free, even when several dependents ask for the same upstream task, and
  // it lets each task start the instant its own dependencies resolve rather
  // than waiting for an arbitrary global ordering.
  const running = new Map();

  function runTask(id) {
    if (running.has(id)) return running.get(id);

    const task = byId.get(id);

    const promise = (async () => {
      // Dependencies are independent of one another, so wait for them
      // concurrently. The recursion here also pulls in grandparents.
      await Promise.all((task.dependencies || []).map(runTask));
      return task.action();
    })();

    // Register BEFORE awaiting so a diamond (D needs B and C, both needing A)
    // cannot start A twice.
    running.set(id, promise);
    return promise;
  }

  // Launch everything at once; each task self-schedules behind its own deps.
  // This achieves the maximum parallelism the graph permits — the critical path
  // is the only lower bound on total time.
  const results = await Promise.all(tasks.map((t) => runTask(t.id)));

  const output = new Map();
  tasks.forEach((task, i) => output.set(task.id, results[i]));

  return output;
}

module.exports = runTaskGraph;
