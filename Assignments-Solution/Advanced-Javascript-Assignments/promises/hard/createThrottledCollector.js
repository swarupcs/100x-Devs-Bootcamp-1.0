// Problem Description – Sliding Window Rate Limited Collector
//
// You are required to implement createThrottledCollector(batchFn, batchSize, msLimit).
//
// The collector receives high-frequency data and processes it in batches.
//
// Requirements:
// 1. Collect incoming items into batches of size batchSize
// 2. Process each batch using batchFn(batch)
// 3. Enforce rate limiting: no more than 2 batches per second (msLimit based)
// 4. add(item) must return a Promise that resolves with the result of the batch
//    that item was processed in

function createThrottledCollector(batchFn, batchSize, msLimit) {
  let buffer = []; // { item, resolve, reject } for the batch being assembled
  let lastRunAt = 0; // when the previous batch was dispatched
  let timer = null;
  const readyBatches = []; // full batches waiting for a rate-limit slot

  function dispatch() {
    if (readyBatches.length === 0) return;

    const now = Date.now();
    const elapsed = now - lastRunAt;

    // Rate limit: enforce a minimum gap of msLimit between batch dispatches.
    // This is the throttle half of the design — batching alone bounds the SIZE
    // of each call, but nothing stops a burst from firing ten full batches back
    // to back and overwhelming the downstream service.
    if (elapsed < msLimit) {
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          dispatch();
        }, msLimit - elapsed);
      }
      return;
    }

    const batch = readyBatches.shift();
    lastRunAt = Date.now();

    const items = batch.map((entry) => entry.item);

    Promise.resolve()
      .then(() => batchFn(items))
      .then(
        // Requirement 4: fan the single batch result back out to every caller
        // whose item was in it. Each add() awaits its own promise and never
        // needs to know it travelled in a group — the batching is invisible.
        (result) => batch.forEach((entry) => entry.resolve(result)),
        (err) => batch.forEach((entry) => entry.reject(err))
      );

    // More batches may be queued behind this one; keep the pipeline moving
    // (still respecting the gap, since dispatch re-checks it).
    if (readyBatches.length > 0) dispatch();
  }

  function add(item) {
    return new Promise((resolve, reject) => {
      buffer.push({ item, resolve, reject });

      if (buffer.length >= batchSize) {
        // Seal this batch and start a fresh buffer. Swapping (rather than
        // clearing in place) matters because batchFn is async and may hold onto
        // the array — anything added meanwhile must join the NEXT batch.
        readyBatches.push(buffer);
        buffer = [];
        dispatch();
      }
    });
  }

  // Force out a partial batch — useful on shutdown, so trailing items that never
  // reached batchSize aren't stranded in the buffer forever.
  function flush() {
    if (buffer.length > 0) {
      readyBatches.push(buffer);
      buffer = [];
    }
    dispatch();
  }

  return { add, flush };
}

module.exports = createThrottledCollector;
