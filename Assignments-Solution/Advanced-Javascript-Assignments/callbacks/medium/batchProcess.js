// Problem Description – Ordered Parallel Batcher
//
// You need to process many items in parallel, but with a fixed
// concurrency limit to avoid resource exhaustion.
//
// Tasks should start as soon as a slot is free, and the final
// results must preserve the original input order.
//
// Requirements:
// - Run at most `limit` workers in parallel.
// - Preserve the original order of results.
// - Start new work as soon as one finishes.
// - Stop and return an error if any task fails.

function batchProcess(items, limit, worker, onComplete) {
  // Edge case first: with no items there is nothing to schedule, and the loop
  // below would never fire `onComplete` because no worker ever finishes.
  if (items.length === 0) {
    return onComplete(null, []);
  }

  // Pre-size the results array so we can write each result at results[i] rather
  // than pushing. THIS is the trick behind "order preservation": tasks finish in
  // arbitrary order, but each one remembers the index it came from and writes
  // back into that exact slot, so completion order never leaks into the output.
  const results = new Array(items.length);

  let nextIndex = 0; // the next item waiting to be picked up by a free worker
  let completed = 0; // how many have finished successfully
  let failed = false; // latch, so one failure reports exactly one error

  // "Start work as soon as a slot frees" is why this is a rolling window, not a
  // fixed-size batch. A naive chunked implementation (run 2, wait for both, run
  // the next 2) idles a worker whenever tasks have uneven durations; here a
  // finished worker immediately grabs the next item.
  function startNext() {
    // Nothing left to hand out, or we've already bailed out on an error.
    if (failed || nextIndex >= items.length) return;

    const index = nextIndex++; // capture the index for THIS task, then advance

    worker(items[index], (err, result) => {
      if (failed) return; // a sibling already failed; ignore this late result

      if (err) {
        // Fail fast: latch so no further callbacks fire, and report immediately
        // without waiting for the still-running siblings to drain.
        failed = true;
        return onComplete(err, null);
      }

      results[index] = result; // write back into the original position
      completed++;

      if (completed === items.length) {
        return onComplete(null, results);
      }

      // This worker's slot is now free — pull the next queued item into it.
      startNext();
    });
  }

  // Prime the pump: launch `limit` workers (or fewer if there aren't that many
  // items). Each one then self-perpetuates via the startNext() call above.
  const initialWorkers = Math.min(limit, items.length);
  for (let i = 0; i < initialWorkers; i++) {
    startNext();
  }
}

module.exports = batchProcess;
