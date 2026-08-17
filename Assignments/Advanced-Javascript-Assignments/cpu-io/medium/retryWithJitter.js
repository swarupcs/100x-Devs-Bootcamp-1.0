// Problem Description – Retry with Exponential Backoff and Jitter
//
// You are required to implement a retry mechanism for an asynchronous task that fails.
// On each retry, the delay before the next attempt should increase, and a small random
// "jitter" should be added to the delay to prevent synchronized retries that can overload
// a server.
// The process should stop once the task succeeds or the maximum retry limit is reached.
//
// Note: `retries` is the number of RETRIES after the initial attempt, so the total number
// of calls is retries + 1.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithJitter(fn, retries = 3, baseDelay = 1000) {
  let lastError;

  // attempt 0 is the initial try; attempts 1..retries are the retries.
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Budget exhausted — surface the most recent error to the caller.
      if (attempt === retries) break;

      // --- Exponential backoff -------------------------------------------------
      // Doubling the wait each round (base, 2×base, 4×base, ...) is the standard
      // way to back off a struggling service. A fixed short delay would hammer a
      // server that is already overloaded and turn a brief hiccup into an outage;
      // growing the gap gives it room to recover.
      const backoff = baseDelay * Math.pow(2, attempt);

      // --- Jitter --------------------------------------------------------------
      // Randomness is not a nicety, it is the point. Picture a thousand clients
      // that all failed at the same instant because one server restarted: with
      // pure exponential backoff they would all retry at exactly base ms, then
      // all at 2×base, re-creating the same thundering herd that knocked the
      // service over — in perfect lockstep, forever.
      //
      // Adding up to 100% extra spread (this is AWS's "full jitter"-style
      // variant) smears those retries across a window so the load arrives as a
      // trickle rather than a spike.
      const jitter = Math.random() * backoff;

      await sleep(backoff + jitter);
    }
  }

  // Every attempt failed. Re-throwing the LAST error (rather than the first)
  // gives the caller the most current explanation of why the operation is
  // failing — the first error may describe a condition that has since changed.
  throw lastError;
}

module.exports = retryWithJitter;
