// Problem Description – Deduplicated Network Request Utility
//
// You are required to build a utility that prevents multiple identical network requests
// from executing simultaneously.
// If the same request (for example, getData('id-1')) is called multiple times at the same
// moment, only one network request should be triggered.
// All callers must receive the same Promise result once the request completes.

const pendingRequests = new Map();

function deduplicatedFetch(id, apiCall) {
  // THE key insight: cache the PROMISE, not the result.
  //
  // A promise is a first-class value representing "work in progress", so handing
  // the same promise to every caller means they all attach their own .then() to
  // one shared operation. This collapses N simultaneous requests into 1 network
  // call while every caller still gets its own independent await.
  //
  // This is called "request coalescing" or "in-flight deduplication", and it's
  // the standard defence against a cache stampede / thundering herd — the moment
  // a hot cache key expires and fifty concurrent requests all miss at once.
  if (pendingRequests.has(id)) {
    return pendingRequests.get(id);
  }

  const promise = apiCall(id).finally(() => {
    // Evict as soon as the request settles — on BOTH success and failure.
    //
    // This is what makes it deduplication rather than caching: we only merge
    // requests that overlap in time. Once the answer has been delivered, the
    // next call starts fresh (a later caller wants current data, and a failed
    // call must be retryable rather than permanently poisoned).
    //
    // .finally() is right here because it passes the settlement through
    // untouched — it neither swallows the rejection nor changes the value.
    pendingRequests.delete(id);
  });

  pendingRequests.set(id, promise);

  return promise;

  // Note the subtle ordering hazard this avoids: we register the promise
  // returned by .finally(), and .finally() itself is what deletes the entry.
  // Since the deletion can only run in a later microtask, every synchronous
  // caller in this same tick is guaranteed to find the entry and share it.
}

module.exports = deduplicatedFetch;
