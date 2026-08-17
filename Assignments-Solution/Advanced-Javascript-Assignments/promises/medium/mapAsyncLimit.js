// Problem Description – Asynchronous Map with Concurrency Limit
//
// You are required to implement an asynchronous version of Array.map that processes items
// using an async callback function.
// Unlike the standard map, this version should only process a limited number of items
// concurrently.
// As soon as one operation finishes, the next should begin.
// The final result must preserve the original order of the input array.

async function mapAsyncLimit(array, limit, asyncFn) {
  const results = new Array(array.length);

  // A shared cursor. Every worker below reads and advances this same counter,
  // which is what lets them cooperatively divide the input without overlapping.
  // (Safe without locks precisely because JS is single-threaded: `nextIndex++`
  // cannot be interrupted mid-way.)
  let nextIndex = 0;

  // One "worker": a loop that keeps claiming the next unprocessed index until
  // the array is exhausted.
  //
  // This is the rolling-window design. The naive alternative — chunk the array
  // and Promise.all each chunk — leaves workers idle whenever durations are
  // uneven, because the whole chunk waits on its slowest member. Here a worker
  // that finishes early immediately claims more work.
  async function worker() {
    while (nextIndex < array.length) {
      const index = nextIndex++; // claim this index for ourselves
      results[index] = await asyncFn(array[index], index);
      // Writing by index is what preserves input order regardless of which
      // worker finished when.
    }
  }

  // Launch exactly `limit` workers. Since each processes one item at a time and
  // there are never more than `limit` of them, concurrency is bounded by
  // construction — there is no counter to check or forget to decrement.
  const workers = Array.from({ length: Math.min(limit, array.length) }, worker);

  // Promise.all here is only used to wait for the workers and to propagate a
  // failure: if asyncFn throws, that worker's loop exits and the rejection
  // surfaces immediately, without waiting for the others to drain.
  await Promise.all(workers);

  return results;
}

module.exports = mapAsyncLimit;
