// Problem Description – Measure Async Execution Time
//
// Your task is to implement a function that takes an asynchronous function `fn`
// and returns the time it took to execute in milliseconds.
//
// Requirements:
// 1. The function should return the duration in ms (rounded to nearest integer or float)
// 2. The function should handle errors (if fn throws, you should still catch the time or rethrow)
// 3. Use performance.now() or Date.now() for timing.

async function measureTime(fn) {
  // performance.now() is preferred over Date.now() for measuring durations:
  //   - it is monotonic, so an NTP clock correction or a daylight-saving jump
  //     mid-measurement can't produce a negative or wildly wrong duration
  //   - it has sub-millisecond resolution, so very fast functions don't all
  //     report exactly 0
  const start = performance.now();

  // `await` is essential here. Without it we would be timing how long it takes
  // to CREATE the promise (effectively zero) rather than how long the work takes
  // to finish — the classic mistake when timing async code.
  //
  // We deliberately do NOT wrap this in try/catch. If `fn` rejects, the
  // rejection propagates straight out of measureTime, which is the desired
  // "rethrow" behaviour: a failed run has no meaningful duration to report, and
  // silently returning a number would hide a real error from the caller.
  await fn();

  // Because each call captures its own `start` in its own closure, concurrent
  // calls to measureTime never interfere with one another.
  return performance.now() - start;
}

module.exports = measureTime;
