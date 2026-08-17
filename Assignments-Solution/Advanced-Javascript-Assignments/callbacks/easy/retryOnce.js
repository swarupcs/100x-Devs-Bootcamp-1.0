// Problem Description – retryOnce(fn)
//
// You are given an async function `fn` (callback style, error-first).
// Your task is to return a new function that calls `fn` and retries it once
// if the first attempt fails.
// If the second attempt also fails, the error should be propagated.

function retryOnce(fn) {
  return function (...args) {
    const callback = args.pop();

    // Attempt #1.
    fn(...args, (err, result) => {
      // Happy path — first try worked, hand the result straight through and
      // importantly do NOT call `fn` again.
      if (!err) {
        return callback(null, result);
      }

      // Attempt #2. This is the whole point of the exercise: transient failures
      // (a dropped packet, a cold cache, a lock contention) often succeed on an
      // immediate retry, so one blind retry buys real reliability for free.
      //
      // Caveat worth knowing: this is only safe for *idempotent* operations.
      // Retrying "charge the card" would double-bill; retrying "read row 7" is fine.
      fn(...args, (retryErr, retryResult) => {
        if (retryErr) {
          // Both attempts failed — propagate the SECOND error (the most recent
          // information about why the operation is failing) and null data.
          return callback(retryErr, null);
        }
        callback(null, retryResult);
      });
    });
  };
}

module.exports = retryOnce;
