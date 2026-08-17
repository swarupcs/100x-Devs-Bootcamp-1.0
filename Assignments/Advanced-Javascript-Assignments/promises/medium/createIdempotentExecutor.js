// Problem Description – Idempotent Async Execution
//
// You need to ensure that an asynchronous task identified by a key
// runs only once. If the same task is triggered again while it is
// still running, all callers should receive the same result.
//
// This problem tests deduplication and state synchronization.

function createIdempotentExecutor() {
  // key -> in-flight promise. Same idea as createSharedRequest, but keyed, so
  // independent operations don't block one another.
  const inFlight = new Map();

  return function run(key, fn) {
    // Someone is already running this exact operation — join it.
    //
    // "Idempotent" here means: no matter how many times the caller asks while
    // the work is underway, the effect happens exactly once. This is how you
    // stop a double-clicked Submit button from creating two orders, or two
    // components mounting at the same time from firing two identical requests.
    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    // Promise.resolve().then(fn) rather than fn() directly: it normalises a
    // function that throws SYNCHRONOUSLY into a rejected promise, so the cleanup
    // below still runs and the entry can't get stuck in the map forever.
    const promise = Promise.resolve()
      .then(() => fn())
      .finally(() => {
        // Evict on settle — success or failure.
        //
        // Deleting on failure is what makes a retry possible: a transient error
        // must not permanently blacklist the key. Deleting on success is what
        // keeps this deduplication rather than caching — the next call gets
        // fresh work, which the "allows re-execution" behaviour depends on.
        inFlight.delete(key);
      });

    inFlight.set(key, promise);

    return promise;

    // Memory note: because entries are always removed on settle, the map's size
    // is bounded by the number of CONCURRENT operations, not by the number of
    // distinct keys ever seen. A cache would need an eviction policy; this
    // doesn't.
  };
}

module.exports = createIdempotentExecutor;
