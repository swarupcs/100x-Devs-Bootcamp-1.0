// Problem Description – Async Cache with Time-to-Live (TTL)
//
// You are required to create an asynchronous cache utility that exposes a get(key, fetcher) method.
// If the requested key already exists in the cache, the cached value should be returned immediately.
// If the key does not exist, the fetcher function should be executed to retrieve the value,
// store it in the cache, and automatically remove the entry after a fixed Time-to-Live (TTL).

class AsyncCache {
  constructor(ttl = 5000) {
    this.ttl = ttl;
    // Map, not a plain object: no prototype keys to collide with ("__proto__",
    // "constructor"), and it preserves key types.
    this.cache = new Map(); // key -> { value, expiresAt }
  }

  async get(key, fetcher) {
    const entry = this.cache.get(key);

    // --- Cache hit -----------------------------------------------------------
    // We compare against a stored expiry rather than relying on a setTimeout to
    // evict. This "lazy expiration" approach is more robust: a timer could be
    // delayed by a busy event loop and briefly serve stale data, whereas an
    // explicit timestamp check is exact at the moment of reading. It also means
    // no dangling timers keeping the process alive.
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }

    // --- Cache miss (or expired) ---------------------------------------------
    // Drop the stale entry so a failed refetch below can't leave us serving it.
    if (entry) this.cache.delete(key);

    // Await the fetch OUTSIDE the try-free path so a rejection propagates.
    // Crucially we only write to the cache after a successful resolution:
    // caching an error would mean one transient blip (a dropped connection, a
    // 500) poisons every caller for the whole TTL — a classic "negative caching"
    // bug that turns a one-second outage into a five-second one.
    const value = await fetcher();

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });

    return value;

    // Known limitation: this deduplicates by TIME but not by CONCURRENCY. Two
    // callers arriving on a cold key before the first fetch resolves will each
    // run the fetcher (a "cache stampede"). Storing the in-flight *promise*
    // rather than the resolved value fixes that — see deduplicatedFetch.js.
  }
}

module.exports = AsyncCache;
