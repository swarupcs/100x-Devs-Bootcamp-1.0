// Problem Description – Promise Shared Cache (Thundering Herd Prevention)
//
// You are given an async function apiCallFn.
// Your task is to implement createSharedRequest(apiCallFn).
//
// The first call should trigger apiCallFn.
// If called again while the request is still pending, return the same promise.
// Once it resolves or rejects, the next call should start a new request.

function createSharedRequest(apiCallFn) {
  // Holds the in-flight promise, or null when idle.
  let pending = null;

  return function (...args) {
    // Someone is already doing this work — join them instead of starting a
    // second identical request.
    //
    // Handing back the SAME promise object is what makes this work. Every caller
    // attaches their own .then() to one shared operation, so N callers cost 1
    // network round trip while each still gets an independent await.
    //
    // The "thundering herd" this prevents: a popular cache key expires and 500
    // concurrent requests all miss at the same instant, each firing its own
    // upstream call and finishing the job the expiry started.
    if (pending) return pending;

    pending = apiCallFn(...args).finally(() => {
      // Clear on BOTH success and failure, so the next call starts fresh.
      //
      // This is deduplication, not caching — it merges requests that OVERLAP IN
      // TIME and nothing more. Keeping the resolved promise around would turn it
      // into an unbounded cache that serves stale data forever, and keeping a
      // rejected one would permanently poison the function after a single
      // transient network blip.
      pending = null;
    });

    return pending;

    // Ordering subtlety: we assign the promise returned BY .finally(), and the
    // reset itself can only run in a later microtask. So every caller arriving
    // in this same synchronous tick is guaranteed to find `pending` set and
    // share it — the reset can never race ahead of them.
  };
}

module.exports = createSharedRequest;
