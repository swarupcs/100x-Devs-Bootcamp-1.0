// Problem Description – Stale-While-Revalidate Cache
//
// You are required to implement swrCache(key, fetchFn).
//
// The cache should return data immediately if available, but also refresh
// the cache in the background.
//
// Requirements:
// 1. If key exists in cache, resolve immediately with cached value
// 2. Always trigger fetchFn() to refresh and update the cache
// 3. If cache is empty, wait for fetchFn() and return its result

// Module-level store, so the cache survives across calls (that's the point).
const cache = new Map();

async function swrCache(key, fetchFn) {
  // --- Cache HIT: stale-while-revalidate -----------------------------------
  if (cache.has(key)) {
    const staleValue = cache.get(key);

    // Kick off a refresh WITHOUT awaiting it. This is the whole strategy, and
    // the missing `await` is deliberate, not an oversight: the user gets an
    // instant response from cache while the network round trip happens
    // invisibly, so the NEXT read is fresh. You trade a little staleness for
    // near-zero perceived latency.
    fetchFn()
      .then((fresh) => {
        cache.set(key, fresh);
      })
      .catch(() => {
        // Swallowing the revalidation error is intentional and important.
        //
        // First, the caller already has a perfectly usable value — a failed
        // background refresh is not their problem, and surfacing it would break
        // a page that was working fine.
        //
        // Second, an unhandled rejection on a floating promise like this one
        // would print a warning and, in older Node versions, crash the process.
        // Any fire-and-forget promise MUST have a terminal .catch().
        //
        // Note we do NOT evict on failure: keeping the stale value is exactly
        // the resilience SWR buys you — the app keeps serving last-known-good
        // data straight through an upstream outage.
      });

    return staleValue;
  }

  // --- Cache MISS: nothing to serve, so we must wait ------------------------
  // The one case where the user pays full latency. Only a successful result is
  // stored, so a failed first fetch doesn't poison the key.
  const fresh = await fetchFn();
  cache.set(key, fresh);

  return fresh;
}

module.exports = swrCache;
