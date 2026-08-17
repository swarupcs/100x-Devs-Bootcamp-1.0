// Problem Description – Guaranteed Async Cleanup
//
// You need to wrap an asynchronous function so that a cleanup
// function is always executed, regardless of whether the async
// function succeeds or fails.

function withCleanup(fn, cleanup) {
  return async function (...args) {
    try {
      // `await` inside the try is essential. Returning the promise without
      // awaiting would exit the try block immediately, and `finally` would run
      // BEFORE the work completed — releasing the connection while the query is
      // still using it. A subtle, extremely painful bug.
      return await fn(...args);
    } finally {
      // Runs on every exit path: normal return, thrown error, even an early
      // return inside fn. This is the async equivalent of RAII / Python's
      // `with` / Go's `defer`, and it's how you guarantee that a DB connection
      // returns to the pool, a file handle closes, a lock releases, or a
      // spinner stops — no matter what went wrong.
      await cleanup();

      // Note: `finally` does not swallow the error. If fn threw, the rejection
      // still propagates to the caller after cleanup completes — which is the
      // correct division of labour: cleanup releases resources, it does not get
      // to decide whether the operation succeeded.
      //
      // (The one hazard: if `cleanup` itself throws, its error REPLACES the
      // original one and the real cause is lost. Cleanup handlers should be
      // written to be as failure-proof as possible.)
    }
  };
}

module.exports = withCleanup;
