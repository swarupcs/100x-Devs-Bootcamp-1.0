// Problem Description – Parallel Execution of Async Functions
//
// You are given an array of asynchronous functions. Your task is to execute
// all of them at the same time (in parallel).
//
// The function should return a promise that resolves to an array of
// resolved values in the same order as the input functions.
//
// If any of the asynchronous functions reject, the returned promise
// should immediately reject with that error.

async function runParallel(functions) {
  // `.map(fn => fn())` invokes every function synchronously, one after another,
  // in a single tick. Each call returns a pending promise, so by the time this
  // line finishes ALL the work is already in flight — they overlap rather than
  // queue. The array holds promises, not results.
  const promises = functions.map((fn) => fn());

  // Promise.all then waits for the whole batch. Two properties matter:
  //
  //   1. ORDER: the output array mirrors the INPUT order, not the completion
  //      order. A function that finishes last still lands at its own index.
  //      (In the test, the instant-returning third function finishes first but
  //      its value "c" still comes third.)
  //
  //   2. FAIL-FAST: the first rejection rejects the whole thing immediately,
  //      without waiting for the stragglers. The others keep running in the
  //      background — promises can't be cancelled — but their results are
  //      discarded.
  //
  // Total elapsed time is therefore max(individual durations), versus the sum
  // of them in runSequential.js.
  return Promise.all(promises);
}

module.exports = runParallel;
