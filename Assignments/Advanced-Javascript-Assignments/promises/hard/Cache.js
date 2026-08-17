// Problem Description – Concurrent Cache with Deduplication and TTL
//
// You are required to implement a cache for async data fetching.
//
// The cache must:
// 1. Deduplicate concurrent requests for the same key
// 2. Cache resolved values with a time-to-live (TTL)
// 3. Return cached values if they are still valid
//
// If a cached value is close to expiry, return the current value
// but trigger a background refresh for future requests.

class Cache {
  constructor(ttl) {
    this.ttl = ttl;
    this.entries = new Map(); // key -> { value, expiresAt }
    this.inFlight = new Map(); // key -> promise, for deduplication

    // Once a value is this far through its life, serve it but refresh in the
    // background. Refreshing at 80% rather than waiting for expiry means the
    // next caller finds a warm cache instead of paying full latency on a miss —
    // the cliff at the TTL boundary disappears.
    this.refreshThreshold = 0.8;
  }

  get(key, fetcher) {
    const entry = this.entries.get(key);
    const now = Date.now();

    if (entry && now < entry.expiresAt) {
      // --- Fresh enough to serve --------------------------------------------
      const age = this.ttl - (entry.expiresAt - now);

      // Nearing expiry: kick off a refresh but DON'T wait for it. The caller
      // gets today's value instantly; tomorrow's caller gets a fresh one.
      if (age >= this.ttl * this.refreshThreshold) {
        // _fetch dedupes internally, so a burst of near-expiry reads still
        // triggers exactly one background refresh.
        this._fetch(key, fetcher).catch(() => {
          // A failed background refresh must never surface to a caller who
          // already has a usable value — and an unhandled rejection on a
          // floating promise would warn or crash the process. Keeping the stale
          // entry is also the resilient choice: the app keeps serving
          // last-known-good data straight through an upstream outage.
        });
      }

      return Promise.resolve(entry.value);
    }

    // --- Miss or expired: the caller must wait --------------------------------
    return this._fetch(key, fetcher);
  }

  // Single point of truth for actually calling the fetcher, with in-flight
  // deduplication.
  _fetch(key, fetcher) {
    // Requirement 1. Handing back the SAME promise means N concurrent callers
    // trigger ONE fetch — the defence against a cache stampede, where a hot key
    // expires and every in-flight request simultaneously misses.
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = Promise.resolve()
      .then(() => fetcher())
      .then((value) => {
        // Only a SUCCESSFUL result is stored. Caching an error would let one
        // transient blip poison every caller for a full TTL.
        this.entries.set(key, {
          value,
          expiresAt: Date.now() + this.ttl,
        });
        return value;
      })
      .finally(() => {
        // Clear the in-flight marker on both paths, so a failure is retryable
        // and the next miss starts fresh work.
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}

module.exports = Cache;
