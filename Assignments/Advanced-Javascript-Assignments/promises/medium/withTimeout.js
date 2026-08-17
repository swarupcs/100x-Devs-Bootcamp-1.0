// Problem Description – withTimeout(promise, ms)
//
// You are required to create a wrapper function named withTimeout that takes a Promise
// and a time limit in milliseconds.
// The function should return a new Promise that settles with the same result as the
// original Promise if it completes within the given time.
// If the Promise does not settle within the time limit, it should reject with the
// message "Timeout".

function withTimeout(promise, ms) {
  let timer;

  // A promise that can only ever reject — the deadline.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout")), ms);
  });

  // Whichever settles first decides the outcome. If `promise` wins, its value OR
  // its own rejection passes through untouched — a real error is never masked as
  // a timeout, which matters a lot when you're reading logs at 3am.
  return Promise.race([promise, timeout]).finally(() => {
    // Release the timer regardless of who won. An armed timer keeps Node's event
    // loop alive, so leaking one per call means a finished script won't exit and
    // a long-lived server accumulates dead handles.
    clearTimeout(timer);
  });

  // Design note on the last test case: after a timeout, the original promise
  // still eventually resolves with "eventual". Nothing is broken by that — the
  // race already settled as rejected, so the late fulfilment is discarded
  // silently. Promises are immutable once settled.
}

module.exports = withTimeout;
