// Problem Description – Async Batch Processor (Time or Count)
//
// You are required to implement createBatcher(processorFn, maxBatchSize, maxWaitMs).
//
// The batcher should collect incoming items and process them in batches.
//
// It must return add(item):
// 1. Add items into a buffer
// 2. If buffer reaches maxBatchSize, call processorFn(batch) immediately
// 3. If maxWaitMs passes before reaching maxBatchSize, call processorFn with the
//    partial batch
// 4. After processing, reset the buffer and timer so no items remain stuck

function createBatcher(processorFn, maxBatchSize, maxWaitMs) {
  let buffer = [];
  let timer = null;

  function flush() {
    // Always disarm the pending timer first. A size-triggered flush that left
    // the old timer running would fire again later on an empty or half-formed
    // buffer — the "ghost flush" this requirement is warning about.
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (buffer.length === 0) return;

    // Swap in a fresh buffer instead of emptying the old one. processorFn is
    // async and may hold a reference to the array it was given; anything added
    // while it runs must belong to the NEXT batch, never retroactively join the
    // one already in flight.
    const batch = buffer;
    buffer = [];

    // Fire and forget, but with a terminal catch: an unhandled rejection from a
    // floating promise warns (and historically crashed) the process, and one
    // failing batch must not stop the batcher from accepting more items.
    try {
      const result = processorFn(batch);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // synchronous throw — same reasoning
    }
  }

  function add(item) {
    buffer.push(item);

    // Trigger 1 — the buffer is full. Flush right away; there is nothing to gain
    // by waiting once we have a full payload.
    if (buffer.length >= maxBatchSize) {
      return flush();
    }

    // Trigger 2 — arm the clock on the first item of a window.
    //
    // Deliberately NOT reset on each subsequent add. Resetting would turn this
    // into a debounce, which under a continuous stream never fires at all and
    // buffers forever. Arming once makes maxWaitMs a genuine latency CEILING:
    // no item waits longer than that, however busy the stream is.
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, maxWaitMs);
    }
  }

  // Returned as an object rather than a bare function so the API has room to
  // grow — `flush` lets a caller force out a partial batch on shutdown, which
  // is the difference between a clean exit and silently losing buffered items.
  return { add, flush };

  // The two triggers cover each other's blind spot: size alone would strand a
  // partial batch forever on a quiet stream, and time alone would let a burst
  // grow unbounded. Together they bound both latency and payload size — the
  // trade every log shipper, metrics agent, and DataLoader makes.
}

module.exports = createBatcher;
