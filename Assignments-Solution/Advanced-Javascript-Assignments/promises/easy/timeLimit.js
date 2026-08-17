// Problem Description – Time-Limited Async Function
//
// You are given an asynchronous function and a time limit t in milliseconds.
// Your task is to wrap this function so that it either resolves normally if it completes
// within the given time or rejects with the message "Time Limit Exceeded" if execution
// takes longer than t.

function timeLimit(fn, t) {
  // Returns a *decorated* version of fn with the same signature — the caller
  // uses it exactly like the original and never sees the timing machinery.
  return async function (...args) {
    // The timeout promise: it never resolves, only rejects. Racing a promise
    // that can only fail against one that can succeed is the standard timeout
    // idiom — whichever settles first decides the outcome.
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject("Time Limit Exceeded"), t);
    });

    // Start the real work and the countdown at the same instant, then take
    // whichever finishes first.
    return Promise.race([fn(...args), timeout]);

    // Important limitation to understand: this bounds how long the CALLER waits,
    // not how long the work runs. Promises have no cancellation, so a timed-out
    // fn keeps executing in the background, still holding its socket/memory, and
    // its eventual result is discarded. Genuinely stopping the work requires
    // cooperation from fn itself — e.g. an AbortSignal it actually honours.
  };
}

module.exports = timeLimit;
