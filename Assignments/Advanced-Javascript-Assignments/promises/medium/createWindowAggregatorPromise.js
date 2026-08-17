// Problem Description – Sliding Window Aggregator
//
// You are required to implement createWindowAggregator(batchProcessFn, size, windowMs).
//
// The aggregator collects items into a batch and processes them together.
//
// It must provide add(item):
// 1. Add item to the current batch
// 2. If batch size reaches size, immediately call batchProcessFn(batch)
// 3. If windowMs expires before reaching size, call batchProcessFn with the partial batch
// 4. After processing, reset the batch and start a new window

function createWindowAggregatorPromise(batchProcessFn, size, windowMs) {
  let batch = [];
  let timer = null;

  // Ship the current batch and reset state.
  function flush() {
    // Cancel any pending time-based flush. Without this, a batch that filled up
    // early would still have its old timer fire later and process an EMPTY (or,
    // worse, a half-formed next) batch — the "ghost flush" bug.
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (batch.length === 0) return;

    // Hand off the current array and immediately install a fresh one. Swapping
    // rather than clearing in place matters: batchProcessFn is async and may
    // hold onto the array, and any item added while it runs must land in the
    // NEXT batch, not retroactively join the one already in flight.
    const toProcess = batch;
    batch = [];

    // Invoke SYNCHRONOUSLY (not via Promise.resolve().then(...)), so that a
    // size-triggered flush takes effect in the same tick as the add() that
    // filled the batch — a caller checking the result immediately afterwards
    // must see it.
    //
    // We still guard both failure modes without awaiting: a synchronous throw
    // via try/catch, and an async rejection via a terminal .catch(). A floating
    // promise with no catch produces an unhandled rejection warning and can
    // crash the process — one failing batch must never take the aggregator down.
    try {
      const maybePromise = batchProcessFn(toProcess);
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {});
      }
    } catch {
      // swallow — the aggregator keeps accepting items regardless
    }
  }

  function add(item) {
    batch.push(item);

    // --- Trigger 1: the batch is full ---------------------------------------
    // Flush synchronously so the caller can observe the effect immediately.
    if (batch.length >= size) {
      return flush();
    }

    // --- Trigger 2: start the clock on the first item of a window -----------
    // The timer is armed once per window and deliberately NOT reset by
    // subsequent adds. That distinction matters: resetting on every add would
    // make this a debounce, which under a steady stream of input never fires at
    // all. Here the timer is a latency CEILING — an item waits at most windowMs
    // no matter how busy the stream is.
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, windowMs);
    }
  }

  return { add, flush };

  // This is the batching pattern behind DataLoader, log shippers, and metrics
  // agents: it trades a bounded amount of latency for a large reduction in the
  // number of round trips. Two triggers are needed because size alone would
  // stall a partial batch forever on a quiet stream, and time alone would let a
  // burst grow without limit.
}

module.exports = createWindowAggregatorPromise;
