// Problem Description – Speculative Cache Warm-up
//
// You are required to implement speculativeFetch(key, apiFn, diskFn).
//
// The function should fetch data using a fast API, but fall back to disk if the API is slow.
//
// Requirements:
// 1. Start apiFn immediately
// 2. If apiFn has not resolved within 200ms, start diskFn
// 3. Resolve with whichever succeeds first
// 4. Even if diskFn resolves first, apiFn must continue in background and update the cache

const SPECULATION_DELAY_MS = 200;

async function speculativeFetch(key, apiFn, diskFn) {
  // Requirement 1: the API is the PREFERRED source (freshest data), so it starts
  // with no delay. Disk is only a consolation prize for when the network is slow.
  const apiPromise = apiFn(key);

  // Requirement 4 — the "speculative warm-up" the exercise is named for.
  //
  // Attach the cache-update handler to the API promise unconditionally, right
  // now, and DON'T await it. Even when disk wins the race and this function has
  // already returned, the API call keeps running; when it finally lands, its
  // fresher value is written to the cache. The slow request isn't wasted — it
  // pays for the NEXT caller, who now gets fresh data with no wait at all.
  apiPromise
    .then((value) => {
      // Read the cache off the exported function object rather than a captured
      // local, so tests (and callers) can swap the cache instance out.
      module.exports.cache.set(key, value);
    })
    .catch(() => {
      // A failed background API call must never surface — the caller already has
      // a usable value from disk. And an unhandled rejection on a floating
      // promise would warn or crash the process, so a terminal catch is
      // mandatory on any fire-and-forget chain.
    });

  return new Promise((resolve, reject) => {
    let settled = false;
    let failures = 0;
    let lastError = null;
    let diskStarted = false;
    let timer;

    const finish = (err, value) => {
      if (settled) return; // first winner takes it; late arrivals are discarded
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(value);
    };

    const onFailure = (err) => {
      failures++;
      lastError = err;

      // The API died before the speculation timer fired. No point waiting out
      // the rest of the delay — the reason for waiting (don't do redundant work
      // while the API might still answer) no longer applies.
      if (!diskStarted) return startDisk();

      // Both sources are gone; only now is this a genuine failure.
      if (failures >= 2) finish(lastError);
    };

    const startDisk = () => {
      if (diskStarted || settled) return;
      diskStarted = true;
      Promise.resolve()
        .then(() => diskFn(key))
        .then((value) => finish(null, value), onFailure);
    };

    apiPromise.then((value) => finish(null, value), onFailure);

    // Requirement 2: arm the fallback. If the API answers within the window,
    // finish() clears this and diskFn is never called at all — so we only pay
    // for the redundant read when it's actually needed.
    timer = setTimeout(startDisk, SPECULATION_DELAY_MS);
  });
}

// The cache lives on the exported function so it can be inspected and replaced
// from outside.
speculativeFetch.cache = new Map();

module.exports = speculativeFetch;
