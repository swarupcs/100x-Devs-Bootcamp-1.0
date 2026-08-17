// Problem Description – Stale-While-Revalidate Flight Tracker
//
// You are required to implement createSWRManager(fetcherFn, ttl).
//
// The manager should return cached data immediately for fast responses,
// but refresh stale data in the background.
//
// Requirements:
// 1. If cached value exists, return it immediately
// 2. If cache age exceeds ttl, trigger a background refresh
// 3. If refresh fails, keep stale cached data (do not crash)
// 4. If multiple calls happen during refresh, deduplicate and share one refresh promise

function createSWRManager(fetcherFn, ttl) {
  const cache = new Map(); // key -> { value, timestamp }
  const refreshing = new Map(); // key -> in-flight refresh promise

  // One place that actually calls the fetcher, with deduplication baked in.
  function refresh(key) {
    // Requirement 4. If a refresh for this key is already running, every
    // additional caller joins it rather than firing a duplicate request. Without
    // this, a stale hot key would trigger one upstream call per concurrent
    // reader — the stampede SWR is supposed to prevent.
    if (refreshing.has(key)) {
      return refreshing.get(key);
    }

    const promise = Promise.resolve()
      .then(() => fetcherFn(key))
      .then((value) => {
        cache.set(key, { value, timestamp: Date.now() });
        return value;
      })
      .finally(() => {
        // Always clear the marker, so a failed refresh can be retried on the
        // next read rather than being permanently stuck.
        refreshing.delete(key);
      });

    refreshing.set(key, promise);
    return promise;
  }

  async function get(key) {
    const entry = cache.get(key);

    // --- Cold cache: nothing to serve, so the caller must wait ----------------
    // The one and only time a caller pays full network latency.
    if (!entry) {
      return refresh(key);
    }

    const isStale = Date.now() - entry.timestamp >= ttl;

    if (isStale) {
      // --- The heart of stale-while-revalidate ------------------------------
      // Kick off the refresh and deliberately do NOT await it. The caller gets
      // the stale value instantly; the network round trip happens invisibly so
      // the NEXT read is fresh.
      //
      // The trade: responses are always fast, at the cost of being up to one
      // refresh-cycle out of date. For a flight tracker, a dashboard, or a
      // feed, that's an excellent bargain — a slightly old answer now beats a
      // perfect answer in 800ms.
      refresh(key).catch(() => {
        // Requirement 3. Swallow refresh failures for two reasons: the caller
        // already has usable data and doesn't need to hear about it, and a
        // floating promise without a terminal catch produces an unhandled
        // rejection that warns (or historically crashed) the process.
        //
        // We deliberately do NOT evict on failure. Keeping the stale value is
        // the resilience SWR buys you: the app keeps working through an outage,
        // serving last-known-good data instead of erroring.
      });
    }

    // Requirement 1: whatever we have, return it immediately — fresh or stale.
    return entry.value;
  }

  return { get };
}

module.exports = createSWRManager;
