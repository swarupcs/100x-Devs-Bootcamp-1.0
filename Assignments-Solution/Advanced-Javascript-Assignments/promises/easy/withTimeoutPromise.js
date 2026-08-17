// Problem Description – Promise Timeout (Race Against Time)
//
// You are given a promise and a timeout duration in milliseconds.
// Your task is to implement withTimeout(promise, ms).
//
// The returned promise should:
// 1. Resolve/reject if the original promise settles within ms
// 2. Reject with "Request Timed Out" if it takes longer than ms

function withTimeoutPromise(promise, ms) {
  let timer;

  // The loser of this race. It can only ever reject.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request Timed Out")), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    // Clear the timer once the race is decided, for two reasons:
    //
    //   1. Node keeps the process alive while a timer is outstanding. Leaking
    //      one means a script that has finished its work still won't exit.
    //   2. It releases the closure (and the promise it captures) for GC.
    //
    // `.finally()` is the right hook because it runs on BOTH paths and — unlike
    // .then()/.catch() — it passes the original settlement straight through
    // without altering the value or swallowing the rejection.
    clearTimeout(timer);
  });

  // Note requirement 1 is satisfied automatically: `race` adopts whatever the
  // original promise did. A genuine "API Error" rejection at 20ms wins the race
  // and propagates unchanged — the wrapper only substitutes its own error when
  // the timer actually gets there first.
}

module.exports = withTimeoutPromise;
