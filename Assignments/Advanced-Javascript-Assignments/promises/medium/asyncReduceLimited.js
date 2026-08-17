// Problem Description – Parallel Chunked Async Reducer
//
// You are required to process an array using a reducer function where the reduction happens
// in sequence, but the data fetching or processing for items is performed in parallel chunks.
// Each chunk should be processed concurrently, then reduced before moving to the next chunk.
// The final reduced result must be correct and deterministic.

// Helper: map with a bounded number of concurrent operations, preserving order.
async function mapAsyncLimit(array, limit, asyncFn) {
  const results = new Array(array.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < array.length) {
      const index = nextIndex++;
      results[index] = await asyncFn(array[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, array.length) }, worker);
  await Promise.all(workers);

  return results;
}

async function asyncReduceLimited(array, limit, asyncProcessFn, reducer, initialValue) {
  // --- Phase 1: process CONCURRENTLY (bounded) -------------------------------
  // The expensive part — fetching, transforming, calling an API — is independent
  // per item, so it runs in parallel up to `limit` at a time.
  const processed = await mapAsyncLimit(array, limit, asyncProcessFn);

  // --- Phase 2: reduce SEQUENTIALLY ------------------------------------------
  // This split is the heart of the exercise. Reduction is inherently ordered:
  // acc = reducer(acc, item) threads a single accumulator through every element,
  // so it cannot be parallelised without either requiring the reducer to be
  // associative or accepting non-deterministic output.
  //
  // Because `processed` is index-ordered (mapAsyncLimit writes by index, not by
  // completion), the reduction sees items in the ORIGINAL input order every
  // time. That's what makes the result deterministic even though the work
  // that produced it finished in a race-dependent order — critical for a
  // non-commutative reducer like array concatenation or string building.
  let accumulator = initialValue;
  for (const value of processed) {
    accumulator = reducer(accumulator, value);
  }

  return accumulator;

  // Empty input: mapAsyncLimit returns [], the loop never runs, and initialValue
  // is returned unchanged — matching Array.prototype.reduce with a seed.
  //
  // Errors: a throw from asyncProcessFn rejects during phase 1, so the reducer
  // is never invoked on a partial, misleading dataset.
}

module.exports = asyncReduceLimited;
