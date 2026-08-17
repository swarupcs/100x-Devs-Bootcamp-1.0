// Problem Description – retryWithBackoff(fn, retries, delay)
//
// You are required to write a function named retryWithBackoff that attempts to execute
// an asynchronous function fn.
// If the execution fails, the function should wait for a specified delay in milliseconds
// before retrying.
// This retry process should continue until the function succeeds or the maximum number
// of retries is reached.
//
// Note: `retries` counts RETRIES after the initial attempt — total calls = retries + 1.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries, delay) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // A success at any point returns immediately and skips all remaining
      // attempts — the loop only continues by falling into `catch`.
      return await fn();
    } catch (err) {
      lastError = err;

      // Out of budget: stop looping and let the throw below deliver the error.
      // Checking here (rather than sleeping first) avoids a pointless final wait
      // before giving up — a surprisingly common bug that adds seconds of dead
      // latency to every failed request.
      if (attempt === retries) break;

      // Exponential backoff: delay, 2×delay, 4×delay, ...
      //
      // The growth is the point. A failing service is often failing *because*
      // it's overloaded; retrying at a fixed short interval adds load exactly
      // when it can least afford it, and a fleet of clients doing so turns a
      // blip into an outage. Backing off geometrically gives it room to recover
      // while still reacting quickly to a one-off glitch.
      await sleep(delay * Math.pow(2, attempt));
    }
  }

  // Surface the most recent failure — it best describes the current state of the
  // world, whereas the first error may describe a condition that has changed.
  throw lastError;

  // Worth knowing: retries are only safe for IDEMPOTENT operations. Retrying a
  // read is free; retrying "create order" can produce duplicates unless the
  // server deduplicates on an idempotency key. See also retryWithJitter.js,
  // which adds randomness so many clients don't retry in lockstep.
}

module.exports = retryWithBackoff;
