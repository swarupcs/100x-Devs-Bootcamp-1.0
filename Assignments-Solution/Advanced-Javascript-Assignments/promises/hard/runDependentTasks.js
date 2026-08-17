// Problem Description – Topological Task Runner (Kahn's Algorithm)
//
// You are given a list of tasks and a dependency list where some tasks depend on others.
// Your task is to implement runDependentTasks(tasks, dependencies).
//
// Requirements:
// 1. Use Topological Sort (Kahn's Algorithm) to resolve dependency order
// 2. Execute tasks with no remaining dependencies in parallel
// 3. Ensure no task starts before all its dependencies are completed
// 4. Throw an error if a cycle exists (invalid dependency graph)
//
// `tasks` is an object { id: asyncFn }.
// `dependencies` is a list of pairs [task, dependsOn] — e.g. ["B", "A"] means
// B can only run after A.

async function runDependentTasks(tasks, dependencies) {
  const ids = Object.keys(tasks);

  // --- Build the graph (Kahn's Algorithm setup) -----------------------------
  // inDegree[x] = how many unfinished prerequisites x still has.
  // dependents[x] = who is waiting on x (the edges we follow when x completes).
  const inDegree = new Map(ids.map((id) => [id, 0]));
  const dependents = new Map(ids.map((id) => [id, []]));

  for (const [task, dependsOn] of dependencies) {
    // Edge direction: dependsOn -> task. Getting this backwards is the single
    // easiest mistake here and produces a perfectly plausible but exactly
    // reversed execution order.
    dependents.get(dependsOn).push(task);
    inDegree.set(task, inDegree.get(task) + 1);
  }

  const results = {};
  let completedCount = 0;

  return new Promise((resolve, reject) => {
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    // Launch a task and, when it finishes, decrement its dependents' counters —
    // starting any that just hit zero. This is Kahn's algorithm run
    // ASYNCHRONOUSLY: rather than draining the ready-set into a linear list, we
    // execute the whole ready-set at once and let completions feed the next wave.
    // The result is maximum parallelism, where a plain topological *ordering*
    // would needlessly serialise independent branches.
    function launch(id) {
      Promise.resolve()
        .then(() => tasks[id]())
        .then(
          (value) => {
            if (settled) return;

            results[id] = value;
            completedCount++;

            if (completedCount === ids.length) {
              settled = true;
              return resolve(results);
            }

            // Relax the outgoing edges.
            for (const dependent of dependents.get(id)) {
              const remaining = inDegree.get(dependent) - 1;
              inDegree.set(dependent, remaining);
              // Zero remaining prerequisites means this task is now runnable.
              if (remaining === 0) launch(dependent);
            }
          },
          fail
        );
    }

    // --- Cycle detection ------------------------------------------------------
    // The elegant part of Kahn's algorithm: cycle detection falls out of the
    // setup for free. Every node in a cycle is waiting on another node in that
    // same cycle, so none of them can ever reach in-degree zero. If NOTHING has
    // in-degree zero at the start, the graph has no valid entry point at all.
    const ready = ids.filter((id) => inDegree.get(id) === 0);

    if (ready.length === 0 && ids.length > 0) {
      return fail(new Error("Cycle detected in dependencies"));
    }

    // (A partial cycle — some roots exist but a subgraph loops — would stall
    // instead of erroring. The check below catches that too: if the number of
    // reachable tasks is smaller than the total, a cycle is hiding downstream.)
    const reachable = new Set();
    const stack = [...ready];
    while (stack.length) {
      const id = stack.pop();
      if (reachable.has(id)) continue;
      reachable.add(id);
      stack.push(...dependents.get(id));
    }
    if (reachable.size < ids.length) {
      return fail(new Error("Cycle detected in dependencies"));
    }

    if (ids.length === 0) return resolve(results);

    // Start every root task simultaneously.
    ready.forEach(launch);
  });
}

module.exports = runDependentTasks;
