// Problem Description – Non-Blocking Large Array Processing
//
// You are given a very large array containing around 100,000 items that must be processed.
// Your task is to implement a strategy that performs this processing without blocking the
// main thread, ensuring the browser UI remains responsive.
// The solution should break the work into smaller chunks and schedule them asynchronously.

async function processLargeArray(items, processFn) {
  // The size of one uninterrupted burst of work. Tuning this is the whole game:
  //   - too small: the overhead of yielding dominates and the job crawls
  //   - too large: each burst is a visible freeze (dropped frames, stalled I/O)
  // A useful rule of thumb for UI work is to keep each chunk under ~5ms so the
  // browser can still hit a 60fps frame budget.
  const CHUNK_SIZE = 500;

  for (let i = 0; i < items.length; i++) {
    // Items are processed strictly in index order. Chunking changes *when* the
    // work happens, never the order it happens in.
    //
    // An exception thrown by processFn propagates out of this async function as
    // a rejection — the loop stops immediately and the caller learns about it,
    // rather than the failure being lost inside a detached timer callback (which
    // is what happens if you build this with raw setTimeout recursion and forget
    // to route errors back to a promise).
    processFn(items[i]);

    // At each chunk boundary, hand the thread back to the event loop. Pending
    // timers, I/O callbacks, click handlers and repaints all get their turn,
    // then we resume at the next index with `i` and every local intact.
    if ((i + 1) % CHUNK_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Note: an empty array simply skips the loop, so processFn is never called and
  // the function resolves immediately — no special case needed.
  //
  // Also note this yields to a MACROTASK (setTimeout). `await Promise.resolve()`
  // would not work: microtasks are drained to completion before the event loop
  // ever reaches timers or rendering, so it would yield to nothing.
}

module.exports = processLargeArray;
